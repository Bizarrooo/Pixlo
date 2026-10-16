import { authHeaders, supabaseConfig } from "./supabase-config";

export const PIXLO_PUBLIC_ORIGIN = "https://pixlo1.vercel.app";

export type PublicProfileShareData = {
  username: string;
  displayName: string;
  avatarUrl: string;
};

export async function getPublicProfileShareData(usernameInput: string): Promise<PublicProfileShareData | null> {
  const username = usernameInput.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) return null;

  try {
    const { url } = supabaseConfig();
    const query = new URLSearchParams({
      select: "username,display_name,settings",
      username: `eq.${username}`,
      limit: "1",
    });
    const response = await fetch(`${url}/rest/v1/profiles?${query.toString()}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const rows = await response.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return null;

    const settings = row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
      ? row.settings as Record<string, unknown>
      : {};
    const rowName = typeof row.display_name === "string" ? row.display_name.trim() : "";
    const settingsName = typeof settings.displayName === "string" ? settings.displayName.trim() : "";
    const displayName = (settingsName || rowName || String(row.username || username)).slice(0, 100);
    const discordAvatar = settings.useDiscordAvatar === true && typeof settings.discordAvatarUrl === "string"
      ? settings.discordAvatarUrl.trim()
      : "";
    const ordinaryAvatar = typeof settings.avatar === "string" ? settings.avatar.trim() : "";
    const candidate = discordAvatar || ordinaryAvatar;\n    const rawBackground = typeof settings.backgroundImage === "string" ? settings.backgroundImage.trim() : "";\n    let backgroundImageUrl = "";\n    if (rawBackground && !rawBackground.startsWith("idb:") && !rawBackground.startsWith("blob:") && !rawBackground.startsWith("data:")) {\n      try { const parsedBackground = new URL(rawBackground, PIXLO_PUBLIC_ORIGIN); if (parsedBackground.protocol === "https:" || parsedBackground.protocol === "http:") backgroundImageUrl = parsedBackground.toString(); } catch {}\n    }
    let avatarUrl = "";

    if (candidate && !candidate.startsWith("idb:") && !candidate.startsWith("blob:") && !candidate.startsWith("data:")) {
      try {
        const parsed = new URL(candidate, PIXLO_PUBLIC_ORIGIN);
        if (parsed.protocol === "https:" || parsed.protocol === "http:") avatarUrl = parsed.toString();
      } catch {
        avatarUrl = "";
      }
    }

    return {
      username: String(row.username || username).trim().toLowerCase(),
      displayName: displayName || username,
      avatarUrl,
    };
  } catch {
    return null;
  }
}
