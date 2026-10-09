import { NextResponse } from "next/server";
import { checkDiscordGuildMembership, refreshDiscordOAuthToken, resolveRequiredDiscordGuildId, type DiscordOAuthTokens } from "../../../lib/discord-membership";
import {
  ensurePixloProfile,
  getSupabaseAuthUser,
  getPixloProfile,
  profileToDashboardUser,
  updatePixloDiscordProfile,
  updatePixloIdentity,
  updatePixloSettings,
} from "../../../lib/pixlo-profile";

export const runtime = "nodejs";

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const value = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] || "";
  try { return decodeURIComponent(value); } catch { return value; }
}

async function currentSession(request: Request) {
  const accessToken = decodeURIComponent(cookieValue(request, "pixlo_access_token"));
  if (!accessToken) return null;
  const authUser = await getSupabaseAuthUser(accessToken);
  if (!authUser) return null;
  const profile = await getPixloProfile(accessToken, authUser.id);
  const ensured = profile || await ensurePixloProfile(accessToken, authUser);
  return { accessToken, authUser, profile: ensured };
}

export async function GET(request: Request) {
  try {
    const session = await currentSession(request);
    if (!session?.profile) return NextResponse.json({ profile: null, user: null });
    let profile = session.profile;
    let refreshTokens: DiscordOAuthTokens | null = null;
    let unlinkDiscord = false;

    // When a linked Discord session exists in this browser, re-check membership
    // whenever the account/profile endpoint is loaded. This clears a link if the
    // Discord user has left the required server, instead of leaving a stale badge.
    const discordAccessToken = cookieValue(request, `pixlo_discord_access_${session.authUser.id}`);
    const discordRefreshToken = cookieValue(request, `pixlo_discord_refresh_${session.authUser.id}`);
    if (profile.discord_id && discordAccessToken) {
      let checkedToken = discordAccessToken;
      let shouldUnlink = false;
      try {
        const meRequest = (token: string) => fetch("https://discord.com/api/v10/users/@me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        let meResponse = await meRequest(checkedToken);
        if (!meResponse.ok && meResponse.status === 401 && discordRefreshToken) {
          refreshTokens = await refreshDiscordOAuthToken(discordRefreshToken);
          if (refreshTokens?.access_token) {
            checkedToken = refreshTokens.access_token;
            meResponse = await meRequest(checkedToken);
          }
        }

        if (meResponse.ok) {
          const me = await meResponse.json().catch(() => ({})) as { id?: string };
          // Never let OAuth tokens for a different Discord account make this profile look verified.
          if (me.id !== profile.discord_id) {
            shouldUnlink = true;
          } else {
            const requiredGuildId = await resolveRequiredDiscordGuildId();
            let membership = await checkDiscordGuildMembership(checkedToken, requiredGuildId);
            if (!membership.ok && membership.status === 401 && discordRefreshToken && !refreshTokens) {
              refreshTokens = await refreshDiscordOAuthToken(discordRefreshToken);
              if (refreshTokens?.access_token) {
                checkedToken = refreshTokens.access_token;
                membership = await checkDiscordGuildMembership(checkedToken, requiredGuildId);
              }
            }
            if (membership.ok && membership.isMember === false) {
              shouldUnlink = true;
            } else if (membership.ok && membership.isMember === true && !profile.discord_membership_verified) {
              const verifiedProfile = await updatePixloDiscordProfile(session.accessToken, session.authUser.id, { discordMembershipVerified: true });
              if (verifiedProfile) profile = verifiedProfile;
            }
          }
        }
      } catch {
        // A transient Discord/API failure is not evidence that the user left the server.
      }

      if (shouldUnlink) {
        await updatePixloDiscordProfile(session.accessToken, session.authUser.id, {
          discordId: null,
          discordUsername: null,
          discordDisplayName: null,
          discordAvatar: null,
          discordAvatarDecoration: null,
          discordMembershipVerified: false,
          useDiscordAvatar: false,
          useDiscordDecoration: false,
        });
        profile = await getPixloProfile(session.accessToken, session.authUser.id) || profile;
        unlinkDiscord = true;
      }
    }
    const payload = profileToDashboardUser(profile);
    const isDiscordLinked = Boolean(profile.discord_id && profile.discord_membership_verified);
    const response = NextResponse.json({ profile: payload, user: isDiscordLinked ? payload : null, discordUnlinkedForMembership: unlinkDiscord });
    const secure = process.env.NODE_ENV === "production";
    if (unlinkDiscord) {
      response.cookies.delete(`pixlo_discord_access_${session.authUser.id}`);
      response.cookies.delete(`pixlo_discord_refresh_${session.authUser.id}`);
    } else if (refreshTokens?.access_token) {
      const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
      response.cookies.set(`pixlo_discord_access_${session.authUser.id}`, refreshTokens.access_token, { ...cookieOptions, maxAge: Math.max(60, Number(refreshTokens.expires_in) || 3600) });
      if (refreshTokens.refresh_token) response.cookies.set(`pixlo_discord_refresh_${session.authUser.id}`, refreshTokens.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
    }
    return response;
  } catch {
    return NextResponse.json({ profile: null, user: null });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await currentSession(request);
    if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
    if (session.profile) {
      await updatePixloDiscordProfile(session.accessToken, session.authUser.id, {
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
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(`pixlo_discord_access_${session.authUser.id}`);
    response.cookies.delete(`pixlo_discord_refresh_${session.authUser.id}`);
    response.cookies.delete("pixlo_discord_access_token");
    response.cookies.delete("pixlo_discord_refresh_token");
    return response;
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to disconnect Discord." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await currentSession(request);
    if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    let profile = session.profile;

    const hasIdentityUpdate = Object.prototype.hasOwnProperty.call(body, "username") || Object.prototype.hasOwnProperty.call(body, "displayName");
    if (hasIdentityUpdate) {
      try {
        profile = await updatePixloIdentity(session.accessToken, session.authUser.id, {
          username: typeof body.username === "string" ? body.username : profile?.username || "",
          displayName: typeof body.displayName === "string" ? body.displayName : profile?.display_name || profile?.username || "",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save your Pixlo profile.";
        const status = /already taken/i.test(message) ? 409 : /3 days|locked until/i.test(message) ? 403 : /username must/i.test(message) ? 400 : 500;
        return NextResponse.json({ ok: false, error: message }, { status });
      }
    }

    const discordPatch: { useDiscordAvatar?: boolean; useDiscordDecoration?: boolean } = {};
    if (typeof body.useDiscordAvatar === "boolean") discordPatch.useDiscordAvatar = body.useDiscordAvatar;
    if (typeof body.useDiscordDecoration === "boolean") discordPatch.useDiscordDecoration = body.useDiscordDecoration;
    if (Object.keys(discordPatch).length) {
      const updated = await updatePixloDiscordProfile(session.accessToken, session.authUser.id, discordPatch);
      if (updated) profile = updated;
    }

    if (body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)) {
      try {
        profile = await updatePixloSettings(session.accessToken, session.authUser.id, body.settings as Record<string, unknown>);
      } catch (error) {
        return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to save your profile customizations." }, { status: 500 });
      }
    }

    if (!profile) return NextResponse.json({ ok: false, error: "Your Pixlo profile could not be loaded." }, { status: 404 });
    const payload = profileToDashboardUser(profile);
    const isDiscordLinked = Boolean(profile.discord_id && profile.discord_membership_verified);
    return NextResponse.json({ ok: true, profile: payload, user: isDiscordLinked ? payload : null });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to save your Pixlo profile." }, { status: 500 });
  }
}
