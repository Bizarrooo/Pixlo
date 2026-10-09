import { serverEnv } from "./server-env";

const DEFAULT_REQUIRED_INVITE = "rdAyWGGDCe";
let cachedGuild: { id: string; expiresAt: number } | null = null;

export type DiscordOAuthTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

export async function resolveRequiredDiscordGuildId(): Promise<string> {
  const configured = serverEnv("DISCORD_REQUIRED_GUILD_ID");
  if (configured) return configured;
  if (cachedGuild && cachedGuild.expiresAt > Date.now()) return cachedGuild.id;
  const inviteCode = serverEnv("DISCORD_REQUIRED_INVITE") || DEFAULT_REQUIRED_INVITE;
  const response = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(inviteCode)}?with_counts=true`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Couldn't verify the required Discord invite (${response.status}).`);
  const invite = await response.json().catch(() => ({})) as { guild?: { id?: string }; guild_id?: string };
  const guildId = invite.guild?.id || invite.guild_id;
  if (!guildId) throw new Error("The required Discord invite did not return a server ID.");
  cachedGuild = { id: guildId, expiresAt: Date.now() + 10 * 60 * 1000 };
  return guildId;
}

export async function refreshDiscordOAuthToken(refreshToken: string): Promise<DiscordOAuthTokens | null> {
  const clientId = serverEnv("DISCORD_CLIENT_ID");
  const clientSecret = serverEnv("DISCORD_CLIENT_SECRET");
  if (!clientId || !clientSecret || !refreshToken) return null;
  const response = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const token = await response.json().catch(() => null) as DiscordOAuthTokens | null;
  return token?.access_token ? token : null;
}

export async function checkDiscordGuildMembership(accessToken: string, guildId: string): Promise<{ ok: boolean; isMember?: boolean; status: number }> {
  const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return { ok: false, status: response.status };
  const guilds = await response.json().catch(() => null) as unknown;
  if (!Array.isArray(guilds)) return { ok: false, status: 502 };
  return {
    ok: true,
    status: response.status,
    isMember: guilds.some(guild => typeof guild === "object" && guild !== null && (guild as { id?: string }).id === guildId),
  };
}
