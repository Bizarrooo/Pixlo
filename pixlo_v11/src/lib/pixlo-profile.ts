import { authHeaders, supabaseConfig } from "./supabase-config";

export type PixloProfile = {
  id: string;
  username: string;
  display_name: string;
  discord_id?: string | null;
  discord_username?: string | null;
  discord_display_name?: string | null;
  discord_avatar?: string | null;
  discord_avatar_decoration?: string | null;
  use_discord_avatar?: boolean | null;
  use_discord_decoration?: boolean | null;
};

export type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

function authFetchHeaders(accessToken: string) {
  return {
    ...authHeaders(),
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function getSupabaseAuthUser(accessToken: string): Promise<SupabaseAuthUser | null> {
  const { url } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: authFetchHeaders(accessToken),
    cache: "no-store",
  });
  if (!response.ok) return null;
  return await response.json() as SupabaseAuthUser;
}

export async function getPixloProfile(accessToken: string, userId: string): Promise<PixloProfile | null> {
  const { url } = supabaseConfig();
  const query = `${url}/rest/v1/profiles?select=*&id=eq.${encodeURIComponent(userId)}&limit=1`;
  const response = await fetch(query, {
    headers: authFetchHeaders(accessToken),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows[0] ? rows[0] as PixloProfile : null;
}

export async function ensurePixloProfile(accessToken: string, authUser: SupabaseAuthUser): Promise<PixloProfile | null> {
  const existing = await getPixloProfile(accessToken, authUser.id);
  if (existing) return existing;

  const metadataUsername = String(authUser.user_metadata?.username || "").trim().toLowerCase();
  const username = metadataUsername || `user-${authUser.id.slice(0, 8)}`;
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) return null;

  const { url } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      ...authFetchHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      id: authUser.id,
      username,
      display_name: username,
    }),
    cache: "no-store",
  });

  if (response.ok) {
    const rows = await response.json().catch(() => []);
    if (Array.isArray(rows) && rows[0]) return rows[0] as PixloProfile;
  }

  // A concurrent trigger/sign-up may have created it between the read and insert.
  return getPixloProfile(accessToken, authUser.id);
}

export function profileToDashboardUser(profile: PixloProfile) {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    discordId: profile.discord_id || undefined,
    discordUsername: profile.discord_username || undefined,
    discordAvatar: profile.discord_avatar || undefined,
    discordAvatarDecoration: profile.discord_avatar_decoration || undefined,
    useDiscordAvatar: Boolean(profile.use_discord_avatar),
    useDiscordDecoration: Boolean(profile.use_discord_decoration),
  };
}

export async function updatePixloDiscordProfile(
  accessToken: string,
  userId: string,
  input: {
    discordId?: string | null;
    discordUsername?: string | null;
    discordDisplayName?: string | null;
    discordAvatar?: string | null;
    discordAvatarDecoration?: string | null;
    useDiscordAvatar?: boolean;
    useDiscordDecoration?: boolean;
  },
) {
  const { url } = supabaseConfig();
  const body = {
    discord_id: input.discordId ?? null,
    discord_username: input.discordUsername ?? null,
    discord_display_name: input.discordDisplayName ?? null,
    discord_avatar: input.discordAvatar ?? null,
    discord_avatar_decoration: input.discordAvatarDecoration ?? null,
    ...(typeof input.useDiscordAvatar === "boolean" ? { use_discord_avatar: input.useDiscordAvatar } : {}),
    ...(typeof input.useDiscordDecoration === "boolean" ? { use_discord_decoration: input.useDiscordDecoration } : {}),
  };

  const response = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: {
      ...authFetchHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "Unable to update your Pixlo profile.");
  }
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows[0] ? rows[0] as PixloProfile : null;
}
