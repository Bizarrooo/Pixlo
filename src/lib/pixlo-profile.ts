import { authHeaders, supabaseConfig } from "./supabase-config";

export type PixloProfile = {
  id: string;
  username: string;
  display_name: string;
  created_at?: string | null;
  username_changed_at?: string | null;
  discord_id?: string | null;
  discord_username?: string | null;
  discord_display_name?: string | null;
  discord_avatar?: string | null;
  discord_avatar_decoration?: string | null;
  discord_membership_verified?: boolean | null;
  use_discord_avatar?: boolean | null;
  use_discord_decoration?: boolean | null;
  settings?: Record<string, unknown> | null;
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

  return getPixloProfile(accessToken, authUser.id);
}

export async function upsertPixloDiscordProfile(
  accessToken: string,
  authUser: SupabaseAuthUser,
  input: {
    discordId: string;
    discordUsername: string;
    discordDisplayName: string;
    discordAvatar?: string | null;
    discordAvatarDecoration?: string | null;
  },
): Promise<PixloProfile> {
  const existingProfile = await getPixloProfile(accessToken, authUser.id);
  const metadataUsername = String(authUser.user_metadata?.username || "").trim().toLowerCase();
  const username = String(existingProfile?.username || metadataUsername || `user-${authUser.id.slice(0, 8)}`).trim().toLowerCase();
  const displayName = String(existingProfile?.display_name || authUser.user_metadata?.display_name || username).trim() || username;
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
    throw new Error("Your Pixlo username is missing or invalid. Please fix your Pixlo username before linking Discord.");
  }

  // Check whether this Discord account is already attached to another Pixlo profile.
  const { url } = supabaseConfig();
  const ownerQuery = `${url}/rest/v1/profiles?select=id,username&discord_id=eq.${encodeURIComponent(input.discordId)}&limit=1`;
  const ownerResponse = await fetch(ownerQuery, {
    headers: authFetchHeaders(accessToken),
    cache: "no-store",
  });
  if (!ownerResponse.ok) {
    const detail = await ownerResponse.text().catch(() => "");
    throw new Error(`Pixlo profile lookup failed (${ownerResponse.status}).${detail ? ` ${detail.slice(0, 220)}` : ""}`);
  }
  const owners = await ownerResponse.json().catch(() => []);
  const owner = Array.isArray(owners) && owners[0] ? owners[0] as { id?: string; username?: string } : null;
  if (owner?.id && owner.id !== authUser.id) {
    throw new Error("That Discord account is already linked to another Pixlo account.");
  }

  // One authenticated REST upsert handles both cases: an old account with no profile row,
  // or an existing profile that just needs its Discord fields updated.
  const upsertResponse = await fetch(`${url}/rest/v1/profiles?on_conflict=id`, {
    method: "POST",
    headers: {
      ...authFetchHeaders(accessToken),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      id: authUser.id,
      username,
      display_name: displayName,
      ...(existingProfile?.username_changed_at ? { username_changed_at: existingProfile.username_changed_at } : {}),
      discord_id: input.discordId,
      discord_username: input.discordUsername,
      discord_display_name: input.discordDisplayName,
      discord_avatar: input.discordAvatar ?? null,
      discord_avatar_decoration: input.discordAvatarDecoration ?? null,
      discord_membership_verified: true,
    }),
    cache: "no-store",
  });

  if (!upsertResponse.ok) {
    const detail = await upsertResponse.text().catch(() => "");
    throw new Error(`Pixlo profile could not be saved (${upsertResponse.status}).${detail ? ` ${detail.slice(0, 300)}` : ""}`);
  }

  const rows = await upsertResponse.json().catch(() => []);
  if (!Array.isArray(rows) || !rows[0]) {
    throw new Error("Pixlo saved the Discord link but did not return the updated profile.");
  }
  return rows[0] as PixloProfile;
}

export async function updatePixloIdentity(
  accessToken: string,
  userId: string,
  input: { username: string; displayName: string },
): Promise<PixloProfile> {
  const current = await getPixloProfile(accessToken, userId);
  if (!current) throw new Error("Your Pixlo profile could not be loaded. Run the latest Supabase schema and try again.");

  const username = input.username.trim().toLowerCase();
  const displayName = input.displayName.trim().slice(0, 48) || username;
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
    throw new Error("Username must be 3–24 characters using lowercase letters, numbers, dots, underscores or hyphens.");
  }

  const changedUsername = username !== current.username.toLowerCase();
  const lastChanged = current.username_changed_at || current.created_at;
  if (changedUsername && lastChanged) {
    const availableAt = new Date(new Date(lastChanged).getTime() + 3 * 24 * 60 * 60 * 1000);
    if (Date.now() < availableAt.getTime()) {
      throw new Error(`Username changes are locked until ${availableAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}. You can change your username once every 3 days.`);
    }
  }

  const { url } = supabaseConfig();
  const body: Record<string, string> = {
    username,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  };
  if (changedUsername) body.username_changed_at = new Date().toISOString();

  const response = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { ...authFetchHeaders(accessToken), Prefer: "return=representation" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 409 || detail.includes("23505")) throw new Error("That username is already taken. Please choose another one.");
    if (detail.toLowerCase().includes("username_change_cooldown")) throw new Error("Username changes are locked for 3 days after account creation or your most recent username change.");
    if (detail.toLowerCase().includes("username_changed_at") || detail.toLowerCase().includes("column")) throw new Error("Run the latest supabase/schema.sql in Supabase before saving account identity changes.");
    throw new Error(`Unable to save your Pixlo profile (${response.status}). ${detail.slice(0, 220)}`);
  }
  const rows = await response.json().catch(() => []);
  if (Array.isArray(rows) && rows[0]) return rows[0] as PixloProfile;
  const updated = await getPixloProfile(accessToken, userId);
  if (!updated) throw new Error("Pixlo did not return your updated profile.");
  return updated;
}

export function profileToDashboardUser(profile: PixloProfile) {
  const lastUsernameChange = profile.username_changed_at || profile.created_at || null;
  const usernameChangeAvailableAt = lastUsernameChange
    ? new Date(new Date(lastUsernameChange).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
    : null;
  return {
    id: profile.id,
    username: profile.username,
    settings: profile.settings && typeof profile.settings === "object" ? profile.settings : {},
    displayName: profile.display_name || profile.username,
    createdAt: profile.created_at || null,
    usernameChangedAt: lastUsernameChange,
    usernameChangeAvailableAt,
    discordId: profile.discord_id || undefined,
    discordUsername: profile.discord_username || undefined,
    discordDisplayName: profile.discord_display_name || undefined,
    discordAvatar: profile.discord_avatar || undefined,
    discordAvatarDecoration: profile.discord_avatar_decoration || undefined,
    discordMembershipVerified: Boolean(profile.discord_membership_verified),
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
    discordMembershipVerified?: boolean;
    useDiscordAvatar?: boolean;
    useDiscordDecoration?: boolean;
  },
) {
  const { url } = supabaseConfig();
  const body = {
    ...(input.discordId !== undefined ? { discord_id: input.discordId } : {}),
    ...(input.discordUsername !== undefined ? { discord_username: input.discordUsername } : {}),
    ...(input.discordDisplayName !== undefined ? { discord_display_name: input.discordDisplayName } : {}),
    ...(input.discordAvatar !== undefined ? { discord_avatar: input.discordAvatar } : {}),
    ...(input.discordAvatarDecoration !== undefined ? { discord_avatar_decoration: input.discordAvatarDecoration } : {}),
    ...(typeof input.discordMembershipVerified === "boolean" ? { discord_membership_verified: input.discordMembershipVerified } : {}),
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
