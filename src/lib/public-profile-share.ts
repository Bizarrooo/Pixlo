import { authHeaders, supabaseConfig } from "./supabase-config";
import { serverEnv } from "./server-env";

export const PIXLO_PUBLIC_ORIGIN = "https://pixlo1.vercel.app";
const PIXLO_OWNER_ID = "3f29f647-4b99-4f53-adf0-eb678bef1c5f";

export type PublicProfileShareData = {
  username: string;
  displayName: string;
  isPremium: boolean;
  avatarUrl: string;
  avatarDecorationUrl: string;
  shareCoverImageUrl: string;
  nameFont: string;
  shareCoverNameSize: number;
  shareCoverNameColour: string;
  shareCoverCreditColour: string;
  shareCoverNameGlow: boolean;
  shareCoverNameGlowIntensity: number;
  shareCoverNameGlowColour: string;
  shareCoverNameGradientEnabled: boolean;
  shareCoverNameGradientColours: [string, string, string];
  shareCoverCreditGradientEnabled: boolean;
  shareCoverCreditGradientColours: [string, string, string];
  backgroundImageUrl: string;
  backgroundVideoUrl: string;
};

function validGradientColours(value: unknown, fallback: [string, string, string]): [string, string, string] {
  if (!Array.isArray(value) || value.length !== 3) return fallback;
  return value.map((colour, index) => typeof colour === "string" && /^#[0-9a-f]{6}$/i.test(colour) ? colour : fallback[index]) as [string, string, string];
}

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
      select: "id,username,display_name,settings",
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
    const profileUserId = typeof row.id === "string" ? row.id : "";
    let isPremium = profileUserId === PIXLO_OWNER_ID;
    const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!isPremium && serviceKey && /^[0-9a-f-]{36}$/i.test(profileUserId)) {
      try {
        const liveMode = Boolean(serverEnv("STRIPE_SECRET_KEY")?.startsWith("sk_live_"));
        const entitlementUrl = `${url}/rest/v1/pixlo_premium_entitlements?select=status&user_id=eq.${encodeURIComponent(profileUserId)}&livemode=eq.${liveMode}&status=eq.active&limit=1`;
        const entitlementResponse = await fetch(entitlementUrl, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store", signal: AbortSignal.timeout(1800) });
        if (entitlementResponse.ok) {
          const entitlements = await entitlementResponse.json().catch(() => []);
          isPremium = Array.isArray(entitlements) && entitlements.length > 0;
        }
      } catch { isPremium = false; }
    }
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
    const shareCoverNameGlowColour = typeof settings.accentColour === "string" && /^#[0-9a-f]{6}$/i.test(settings.accentColour)
      ? settings.accentColour
      : "#ff6946";
    const shareCoverNameGradientColours = validGradientColours(settings.shareCoverNameGradientColours, ["#ff8a00", "#ff3e5f", "#b14dff"]);
    const shareCoverCreditGradientColours = validGradientColours(settings.shareCoverCreditGradientColours, ["#ffffff", "#ffd2b4", "#ffffff"]);

    return {
      username: String(row.username || username).trim().toLowerCase(),
      displayName: displayName || username,
      isPremium,
      avatarUrl,
      avatarDecorationUrl: isPremium ? avatarDecorationUrl : "",
      shareCoverImageUrl: isPremium ? publicAssetUrl(settings.shareCoverImage) : "",
      nameFont: isPremium && typeof settings.nameFont === "string" && settings.nameFont.trim() ? settings.nameFont.trim() : "Inter",
      shareCoverNameSize: isPremium ? shareCoverNameSize : 66,
      shareCoverNameColour: isPremium ? shareCoverNameColour : "#ffffff",
      shareCoverCreditColour: isPremium ? shareCoverCreditColour : "#ffffff",
      shareCoverNameGlow: isPremium && shareCoverNameGlow,
      shareCoverNameGlowIntensity: isPremium ? shareCoverNameGlowIntensity : 65,
      shareCoverNameGlowColour,
      shareCoverNameGradientEnabled: isPremium && settings.shareCoverNameGradientEnabled === true,
      shareCoverNameGradientColours,
      shareCoverCreditGradientEnabled: isPremium && settings.shareCoverCreditGradientEnabled === true,
      shareCoverCreditGradientColours,
      backgroundImageUrl: isPremium ? publicAssetUrl(settings.backgroundImage) : "",
      backgroundVideoUrl: isPremium ? publicAssetUrl(settings.backgroundVideo) : "",
    };
  } catch {
    return null;
  }
}
