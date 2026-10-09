import { NextResponse } from "next/server";
import { serverEnv } from "../../../../../lib/server-env";
import { checkDiscordGuildMembership, resolveRequiredDiscordGuildId, type DiscordOAuthTokens } from "../../../../../lib/discord-membership";
import { ensurePixloProfile, getPixloProfile, getSupabaseAuthUser, updatePixloDiscordProfile, upsertPixloDiscordProfile } from "../../../../../lib/pixlo-profile";

export const runtime = "nodejs";

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  avatar_decoration_data?: { asset?: string | null; sku_id?: string | null } | null;
};

function readCookie(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const match = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function dashboardRedirect(baseUrl: string, status: string, detail?: string) {
  const target = new URL("/dashboard", baseUrl);
  target.searchParams.set("discord", status);
  if (detail) target.searchParams.set("discord_detail", detail);
  return NextResponse.redirect(target);
}

async function clearDiscordLinkForUser(accessToken: string, userId: string) {
  const profile = await getPixloProfile(accessToken, userId);
  const ensured = profile || await getSupabaseAuthUser(accessToken).then(user => user ? ensurePixloProfile(accessToken, user) : null);
  if (ensured?.discord_id) {
    await updatePixloDiscordProfile(accessToken, userId, {
      discordId: null,
      discordUsername: null,
      discordDisplayName: null,
      discordAvatar: null,
      discordAvatarDecoration: null,
      discordMembershipVerified: false,
      useDiscordAvatar: false,
      useDiscordDecoration: false,
    });
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const baseUrl = (serverEnv("NEXT_PUBLIC_APP_URL") || requestUrl.origin).replace(/\/$/, "");
  const stateCookie = readCookie(request, "pixlo_discord_state");
  const pixloUserId = readCookie(request, "pixlo_discord_user");
  const accessToken = readCookie(request, "pixlo_access_token");
  const clientId = serverEnv("DISCORD_CLIENT_ID");
  const clientSecret = serverEnv("DISCORD_CLIENT_SECRET");

  const cleanup = (response: NextResponse) => {
    for (const cookieName of ["pixlo_discord_state", "pixlo_discord_user", "pixlo_discord_username"]) {
      response.cookies.delete(cookieName);
    }
    return response;
  };

  if (error === "access_denied") return cleanup(dashboardRedirect(baseUrl, "cancelled"));
  if (!code || !state || !stateCookie || state !== stateCookie || !pixloUserId) {
    return cleanup(dashboardRedirect(baseUrl, "error", "OAuth state was missing or expired. Start Discord linking again."));
  }
  if (!clientId || !clientSecret) {
    return cleanup(dashboardRedirect(baseUrl, "error", "Discord Client ID/Secret is missing from .env.local."));
  }
  if (!accessToken) {
    return cleanup(dashboardRedirect(baseUrl, "error", "Your Pixlo session expired. Please log in again."));
  }

  try {
    const authUser = await getSupabaseAuthUser(accessToken);
    if (!authUser || authUser.id !== pixloUserId) {
      return cleanup(dashboardRedirect(baseUrl, "error", "Your Pixlo session could not be verified. Please log in again."));
    }

    const callback = `${baseUrl}/api/auth/discord/callback`;
    const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callback }),
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      const detail = await tokenResponse.text().catch(() => "");
      return cleanup(dashboardRedirect(baseUrl, "error", `Discord token exchange failed (${tokenResponse.status}). ${detail.slice(0, 260)}`));
    }

    const token = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!token.access_token) return cleanup(dashboardRedirect(baseUrl, "error", "Discord did not return an access token."));

    const meResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    });
    if (!meResponse.ok) {
      const detail = await meResponse.text().catch(() => "");
      return cleanup(dashboardRedirect(baseUrl, "error", `Discord profile lookup failed (${meResponse.status}). ${detail.slice(0, 260)}`));
    }
    const me = await meResponse.json() as DiscordUser;

    // Pixlo Discord membership is mandatory. Resolve its ID from the invite unless
    // a server ID override is configured, then fail closed if membership can't be proven.
    let requiredGuildId: string;
    try {
      requiredGuildId = await resolveRequiredDiscordGuildId();
    } catch (membershipError) {
      return cleanup(dashboardRedirect(baseUrl, "error", membershipError instanceof Error ? membershipError.message : "Could not verify the required Discord server."));
    }
    const membership = await checkDiscordGuildMembership(token.access_token, requiredGuildId);
    if (!membership.ok) {
      return cleanup(dashboardRedirect(baseUrl, "error", `Discord server membership check failed (${membership.status}). Reconnect and approve the server-list permission.`));
    }
    if (!membership.isMember) {
      try {
        await clearDiscordLinkForUser(accessToken, authUser.id);
      } catch (unlinkError) {
        const detail = unlinkError instanceof Error ? unlinkError.message : "Unknown profile error.";
        return cleanup(dashboardRedirect(baseUrl, "error", `You're not in the required Discord server, and the previous link could not be cleared: ${detail.slice(0, 180)}`));
      }
      const response = cleanup(dashboardRedirect(baseUrl, "not-member", "You must join the official Pixlo Discord server before linking your account: https://discord.gg/Bkz4P9gVy7. Any previous Discord link on this Pixlo account has been disconnected."));
      response.cookies.delete(`pixlo_discord_access_${authUser.id}`);
      response.cookies.delete(`pixlo_discord_refresh_${authUser.id}`);
      response.cookies.delete("pixlo_discord_access_token");
      response.cookies.delete("pixlo_discord_refresh_token");
      return response;
    }

    const avatarUrl = me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=256` : null;
    const decorationAsset = me.avatar_decoration_data?.asset || null;
    const decorationUrl = decorationAsset ? `https://cdn.discordapp.com/avatar-decoration-presets/${decorationAsset}.png?size=256` : null;
    const discordDisplayName = me.global_name || me.username;

    const profile = await upsertPixloDiscordProfile(accessToken, authUser, {
      discordId: me.id,
      discordUsername: me.username,
      discordDisplayName,
      discordAvatar: avatarUrl,
      discordAvatarDecoration: decorationUrl,
    });

    if (!profile || profile.id !== authUser.id || profile.discord_id !== me.id) {
      return cleanup(dashboardRedirect(baseUrl, "error", "Discord was authorized, but Pixlo could not confirm the saved profile. Refresh the dashboard and try again."));
    }

    const response = cleanup(dashboardRedirect(baseUrl, "connected"));
    const secure = process.env.NODE_ENV === "production";
    const tokenCookie = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
    response.cookies.set(`pixlo_discord_access_${authUser.id}`, token.access_token, {
      ...tokenCookie,
      maxAge: Math.max(60, Number(token.expires_in) || 3600),
    });
    if (token.refresh_token) {
      response.cookies.set(`pixlo_discord_refresh_${authUser.id}`, token.refresh_token, { ...tokenCookie, maxAge: 60 * 60 * 24 * 30 });
    }
    return response;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unable to save the Discord link.";
    return cleanup(dashboardRedirect(baseUrl, "error", detail));
  }
}
