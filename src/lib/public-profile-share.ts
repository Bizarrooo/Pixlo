import { authHeaders, supabaseConfig } from "./supabase-config";

export const PIXLO_PUBLIC_ORIGIN = "https://pixlo1.vercel.app";

export type PublicProfileShareData = {
  username: string;
  displayName: string;
  avatarUrl: string;
  avatarDecorationUrl: string;
  shareCoverImageUrl: string;
  shareCoverNameSize: number;
  shareCoverNameColour: string;
  shareCoverCreditColour: string;
  shareCoverNameGlow: boolean;
  shareCoverNameGlowIntensity: number;
  shareCoverNameGlowColour: string;
  backgroundImageUrl: string;
  backgroundVideoUrl: string;
};

function publicAssetUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw || /^(?:idb:|blob:|data:)/i.test(raw)) return "";
  try {
    const parsed = new URL(raw, PIXLO_PUBLIC_ORIGIN);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

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
    const avatarUrl = publicAssetUrl(discordAvatar || ordinaryAvatar);
    const avatarDecorationUrl = settings.useDiscordDecoration === true
      ? publicAssetUrl(settings.discordAvatarDecorationUrl)
      : "";
    const shareCoverNameSize = typeof settings.shareCoverNameSize === "number" && Number.isFinite(settings.shareCoverNameSize)
      ? Math.min(110, Math.max(28, Math.round(settings.shareCoverNameSize)))
      : 66;
    const shareCoverNameColour = typeof settings.shareCoverNameColour === "string" && /^#[0-9a-f]{6}$/i.test(settings.shareCoverNameColour)
      ? settings.shareCoverNameColour
      : "#ffffff";
    const shareCoverCreditColour = typeof settings.shareCoverCreditColour === "string" && /^#[0-9a-f]{6}$/i.test(settings.shareCoverCreditColour)
      ? settings.shareCoverCreditColour
      : "#e3dcd8";
    const shareCoverNameGlow = settings.shareCoverNameGlow === true;
    const shareCoverNameGlowIntensity = typeof settings.shareCoverNameGlowIntensity === "number" && Number.isFinite(settings.shareCoverNameGlowIntensity)
      ? Math.min(200, Math.max(0, settings.shareCoverNameGlowIntensity))
      : 65;

    return {
      username: String(row.username || username).trim().toLowerCase(),
      displayName: displayName || username,
      avatarUrl,
      avatarDecorationUrl,
      shareCoverImageUrl: publicAssetUrl(settings.shareCoverImage),
      shareCoverNameSize,
      shareCoverNameColour,
      shareCoverCreditColour,
      shareCoverNameGlow,
      shareCoverNameGlowIntensity,
      shareCoverNameGlowColour,
      backgroundImageUrl: publicAssetUrl(settings.backgroundImage),
      backgroundVideoUrl: publicAssetUrl(settings.backgroundVideo),
    };
  } catch {
    return null;
  }
}
