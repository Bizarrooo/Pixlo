import { NextResponse } from "next/server";
import {
  ensurePixloProfile,
  getSupabaseAuthUser,
  getPixloProfile,
  profileToDashboardUser,
  updatePixloDiscordProfile,
} from "../../../lib/pixlo-profile";
import { clearDiscordLink, findUserByUsername, updateDiscordPreferences } from "../../serverDb";

export const runtime = "nodejs";

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  return raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] || "";
}

function localToDashboardUser(user: Awaited<ReturnType<typeof findUserByUsername>>) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    discordId: user.discordId,
    discordUsername: user.discordUsername,
    discordAvatar: user.discordAvatar,
    discordAvatarDecoration: user.discordAvatarDecoration,
    useDiscordAvatar: Boolean(user.useDiscordAvatar),
    useDiscordDecoration: Boolean(user.useDiscordDecoration),
  };
}

async function currentSession(request: Request) {
  const accessToken = decodeURIComponent(cookieValue(request, "pixlo_access_token"));
  if (!accessToken) return null;
  const authUser = await getSupabaseAuthUser(accessToken);
  if (!authUser) return null;
  const profile = await getPixloProfile(accessToken, authUser.id);
  const ensured = profile || await ensurePixloProfile(accessToken, authUser);
  const username = String(authUser.user_metadata?.username || "").trim().toLowerCase();
  const localUser = username ? await findUserByUsername(username) : null;
  return { accessToken, authUser, profile: ensured, localUser };
}

export async function GET(request: Request) {
  try {
    const session = await currentSession(request);
    if (!session) return NextResponse.json({ user: null });
    if (session.profile) {
      const profileUser = profileToDashboardUser(session.profile);
      const localUser = localToDashboardUser(session.localUser);
      if (localUser?.discordId) {
        return NextResponse.json({
          user: {
            ...profileUser,
            discordId: localUser.discordId,
            discordUsername: localUser.discordUsername,
            discordAvatar: localUser.discordAvatar,
            discordAvatarDecoration: localUser.discordAvatarDecoration,
            useDiscordAvatar: localUser.useDiscordAvatar,
            useDiscordDecoration: localUser.useDiscordDecoration,
          },
        });
      }
      return NextResponse.json({ user: profileUser });
    }
    if (session.localUser) return NextResponse.json({ user: localToDashboardUser(session.localUser) });
    return NextResponse.json({ user: null });
  } catch {
    return NextResponse.json({ user: null });
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
        useDiscordAvatar: false,
        useDiscordDecoration: false,
      });
    }
    if (session.localUser) await clearDiscordLink(session.localUser.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to disconnect Discord." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await currentSession(request);
    if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const patch: { useDiscordAvatar?: boolean; useDiscordDecoration?: boolean } = {};
    if (typeof body.useDiscordAvatar === "boolean") patch.useDiscordAvatar = body.useDiscordAvatar;
    if (typeof body.useDiscordDecoration === "boolean") patch.useDiscordDecoration = body.useDiscordDecoration;

    let user = session.localUser;
    if (user) user = await updateDiscordPreferences(user.id, patch);
    if (session.profile) {
      const updated = await updatePixloDiscordProfile(session.accessToken, session.authUser.id, patch);
      return NextResponse.json({ ok: true, user: updated ? profileToDashboardUser(updated) : profileToDashboardUser(session.profile) });
    }
    return NextResponse.json({ ok: true, user: localToDashboardUser(user) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to save Discord profile preferences." }, { status: 500 });
  }
}
