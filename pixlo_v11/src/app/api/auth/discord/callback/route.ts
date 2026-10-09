import { NextResponse } from "next/server";
import { serverEnv } from "../../../../../lib/server-env";
import { getSupabaseAuthUser, getPixloProfile, updatePixloDiscordProfile } from "../../../../../lib/pixlo-profile";
import { upsertDiscordUser } from "../../../../serverDb";

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

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const baseUrl = (serverEnv("NEXT_PUBLIC_APP_URL") || requestUrl.origin).replace(/\/$/, "");
  const stateCookie = readCookie(request, "pixlo_discord_state");
  const pixloUserId = readCookie(request, "pixlo_discord_user");
  const pixloUsernameCookie = readCookie(request, "pixlo_discord_username");
  const accessToken = readCookie(request, "pixlo_access_token");
  const clientId = serverEnv("DISCORD_CLIENT_ID");
  const clientSecret = serverEnv("DISCORD_CLIENT_SECRET");

  const cleanup = (response: NextResponse) => {
    response.cookies.delete("pixlo_discord_state");
    response.cookies.delete("pixlo_discord_user");
    response.cookies.delete("pixlo_discord_username");
    return response;
  };

  if (error === "access_denied") return cleanup(dashboardRedirect(baseUrl, "cancelled"));
  if (!code || !state || !stateCookie || state !== stateCookie || !pixloUserId) {
    return cleanup(dashboardRedirect(baseUrl, "error", "OAuth state was missing or expired."));
  }
  if (!clientId || !clientSecret) {
    return cleanup(dashboardRedirect(baseUrl, "error", "Discord Client ID/Secret is missing from .env.local."));
  }
  if (!accessToken) {
    return cleanup(dashboardRedirect(baseUrl, "error", "Your Pixlo session expired. Please log in again."));
  }

  const authUser = await getSupabaseAuthUser(accessToken);
  if (!authUser || authUser.id !== pixloUserId) {
    return cleanup(dashboardRedirect(baseUrl, "error", "Your Pixlo session could not be verified. Please log in again."));
  }

  const pixloUsername = String(authUser.user_metadata?.username || pixloUsernameCookie || `user-${authUser.id.slice(0, 8)}`).trim().toLowerCase();
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
    return cleanup(dashboardRedirect(baseUrl, "error", `Discord token exchange failed${detail ? `: ${detail.slice(0, 180)}` : "."}`));
  }

  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) return cleanup(dashboardRedirect(baseUrl, "error", "Discord did not return an access token."));

  const meResponse = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  if (!meResponse.ok) {
    const detail = await meResponse.text().catch(() => "");
    return cleanup(dashboardRedirect(baseUrl, "error", `Discord profile lookup failed${detail ? `: ${detail.slice(0, 180)}` : "."}`));
  }
  const me = await meResponse.json() as DiscordUser;

  const requiredGuildId = serverEnv("DISCORD_REQUIRED_GUILD_ID");
  if (requiredGuildId) {
    const guildResponse = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    });
    if (!guildResponse.ok) return cleanup(dashboardRedirect(baseUrl, "error", "Discord server membership could not be checked."));
    const guilds = await guildResponse.json().catch(() => [] as unknown[]);
    if (!Array.isArray(guilds) || !guilds.some((guild) => typeof guild === "object" && guild !== null && (guild as { id?: string }).id === requiredGuildId)) {
      return cleanup(dashboardRedirect(baseUrl, "not-member"));
    }
  }

  const avatarUrl = me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=256` : null;
  const decorationAsset = me.avatar_decoration_data?.asset || null;
  const decorationUrl = decorationAsset ? `https://cdn.discordapp.com/avatar-decoration-presets/${decorationAsset}.png?size=256` : null;
  const discordDisplayName = me.global_name || me.username;

  // Discord linking must never be blocked by a missing/old Supabase profile row.
  // The existing Pixlo account identity is the authenticated Supabase user metadata username.
  try {
    const localUser = await upsertDiscordUser({
      id: me.id,
      username: me.username,
      avatar: avatarUrl,
      avatarDecoration: decorationUrl,
      pixloUsername,
      displayName: discordDisplayName,
    });

    // Best-effort sync to Supabase when that profile row exists. This is deliberately non-blocking
    // so older Pixlo accounts can still connect Discord without a fragile profile migration step.
    try {
      const profile = await getPixloProfile(accessToken, authUser.id);
      if (profile) {
        await updatePixloDiscordProfile(accessToken, authUser.id, {
          discordId: me.id,
          discordUsername: me.username,
          discordDisplayName,
          discordAvatar: avatarUrl,
          discordAvatarDecoration: decorationUrl,
        });
      }
    } catch {}

    const response = dashboardRedirect(baseUrl, "connected");
    response.cookies.set("pixlo_user", localUser.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return cleanup(response);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Your Discord account could not be linked to this Pixlo account.";
    return cleanup(dashboardRedirect(baseUrl, "error", detail));
  }
}
