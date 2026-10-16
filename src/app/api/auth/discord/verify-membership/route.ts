import { NextResponse } from "next/server";
import { checkDiscordGuildMembership, refreshDiscordOAuthToken, resolveRequiredDiscordGuildId } from "../../../../../lib/discord-membership";
import { getSupabaseAuthUser, updatePixloDiscordProfile, upsertPixloDiscordProfile } from "../../../../../lib/pixlo-profile";

export const runtime = "nodejs";

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const match = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  avatar_decoration_data?: { asset?: string | null } | null;
};

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ verified: false, error: "Invalid request origin." }, { status: 403 });
  }

  const pixloAccessToken = cookieValue(request, "pixlo_access_token");
  if (!pixloAccessToken) {
    return NextResponse.json({ verified: false, error: "Log in to Pixlo again.", code: "pending-expired" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const authUser = await getSupabaseAuthUser(pixloAccessToken);
    if (!authUser) {
      return NextResponse.json({ verified: false, error: "Log in to Pixlo again.", code: "pending-expired" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const pendingAccessName = `pixlo_discord_pending_access_${authUser.id}`;
    const pendingRefreshName = `pixlo_discord_pending_refresh_${authUser.id}`;
    let discordAccessToken = cookieValue(request, pendingAccessName);
    let discordRefreshToken = cookieValue(request, pendingRefreshName);
    if (!discordAccessToken) {
      return NextResponse.json({ verified: false, error: "Your pending Discord connection expired. Link Discord again.", code: "pending-expired" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    let refreshed = false;
    const fetchDiscordUser = (token: string) => fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    let meResponse = await fetchDiscordUser(discordAccessToken);
    if (meResponse.status === 401 && discordRefreshToken) {
      const newTokens = await refreshDiscordOAuthToken(discordRefreshToken);
      if (newTokens?.access_token) {
        discordAccessToken = newTokens.access_token;
        discordRefreshToken = newTokens.refresh_token || discordRefreshToken;
        refreshed = true;
        meResponse = await fetchDiscordUser(discordAccessToken);
      }
    }
    if (!meResponse.ok) {
      if (meResponse.status === 401) {
        return NextResponse.json({ verified: false, error: "Your pending Discord connection expired. Link Discord again.", code: "pending-expired" }, { status: 401, headers: { "Cache-Control": "no-store" } });
      }
      return NextResponse.json({ verified: false, error: "Discord could not confirm the pending account.", code: "discord-error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    const me = await meResponse.json() as DiscordUser;

    let guildId: string;
    try {
      guildId = await resolveRequiredDiscordGuildId();
    } catch (error) {
      return NextResponse.json({ verified: false, error: error instanceof Error ? error.message : "Unable to resolve the Pixlo server." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }

    let membership = await checkDiscordGuildMembership(discordAccessToken, guildId);
    if (!membership.ok && membership.status === 401 && discordRefreshToken && !refreshed) {
      const newTokens = await refreshDiscordOAuthToken(discordRefreshToken);
      if (newTokens?.access_token) {
        discordAccessToken = newTokens.access_token;
        discordRefreshToken = newTokens.refresh_token || discordRefreshToken;
        refreshed = true;
        membership = await checkDiscordGuildMembership(discordAccessToken, guildId);
      }
    }
    if (!membership.ok) {
      return NextResponse.json({ verified: false, error: "Discord membership verification is temporarily unavailable.", code: "discord-error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    if (!membership.isMember) {
      return NextResponse.json({ verified: false, member: false }, { headers: { "Cache-Control": "no-store" } });
    }

    const avatarUrl = me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=256` : null;
    const decorationAsset = me.avatar_decoration_data?.asset || null;
    const decorationUrl = decorationAsset ? `https://cdn.discordapp.com/avatar-decoration-presets/${decorationAsset}.png?size=256` : null;
    const profile = await upsertPixloDiscordProfile(pixloAccessToken, authUser, {
      discordId: me.id,
      discordUsername: me.username,
      discordDisplayName: me.global_name || me.username,
      discordAvatar: avatarUrl,
      discordAvatarDecoration: decorationUrl,
    });
    if (!profile || profile.id !== authUser.id || profile.discord_id !== me.id) {
      return NextResponse.json({ verified: false, error: "Pixlo could not confirm the saved Discord profile.", code: "profile-save-failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }
    const verifiedProfile = await updatePixloDiscordProfile(pixloAccessToken, authUser.id, { discordMembershipVerified: true });
    if (!verifiedProfile || verifiedProfile.discord_id !== me.id || !verifiedProfile.discord_membership_verified) {
      return NextResponse.json({ verified: false, error: "Pixlo could not save the membership confirmation.", code: "profile-save-failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }

    const response = NextResponse.json({ verified: true }, { headers: { "Cache-Control": "no-store" } });
    const secure = process.env.NODE_ENV === "production";
    const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
    response.cookies.set(`pixlo_discord_access_${authUser.id}`, discordAccessToken, { ...cookieOptions, maxAge: 3600 });
    if (discordRefreshToken) {
      response.cookies.set(`pixlo_discord_refresh_${authUser.id}`, discordRefreshToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
    }
    response.cookies.delete(pendingAccessName);
    response.cookies.delete(pendingRefreshName);
    return response;
  } catch (error) {
    return NextResponse.json({
      verified: false,
      error: error instanceof Error ? error.message : "Unable to verify server membership.",
      code: "verification-failed",
    }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
