import { ImageResponse } from "next/og";
import type { PublicProfileShareData } from "./public-profile-share";
import { supabaseConfig } from "./supabase-config";

export const SHARE_COVER_SIZE = { width: 1200, height: 630 };

type RenderMode = "full" | "overlay";

const FONT_ALIASES: Record<string, string> = {
  Inter: "Inter",
  "DM Sans": "DM Sans",
  Manrope: "Manrope",
  Poppins: "Poppins",
  Montserrat: "Montserrat",
  "Space Grotesk": "Space Grotesk",
  Outfit: "Outfit",
  "Plus Jakarta Sans": "Plus Jakarta Sans",
  Rubik: "Rubik",
  Raleway: "Raleway",
  "Playfair Display": "Playfair Display",
  "Bebas Neue": "Bebas Neue",
  Oswald: "Oswald",
  "JetBrains Mono": "JetBrains Mono",
  "Fira Code": "Fira Code",
  Arial: "Inter",
  system: "Inter",
  monospace: "JetBrains Mono",
  Georgia: "Playfair Display",
  "Courier New": "Fira Code",
  "Trebuchet MS": "Manrope",
  Impact: "Oswald",
  "Times New Roman": "Playfair Display",
  Verdana: "Inter",
};
const FONT_CACHE = new Map<string, Promise<ArrayBuffer | null>>();

function profileFontName(profile: PublicProfileShareData | null) {
  return typeof profile?.nameFont === "string" && FONT_ALIASES[profile.nameFont]
    ? profile.nameFont
    : "Inter";
}

async function loadGoogleFont(family: string, sample: string): Promise<ArrayBuffer | null> {
  const key = family + "|" + sample;
  const cached = FONT_CACHE.get(key);
  if (cached) return cached;

  const pending = (async () => {
    try {
      const familyQuery = encodeURIComponent(family).replace(/%20/g, "+");
      const url = "https://fonts.googleapis.com/css2?family=" + familyQuery + ":wght@800&text=" + encodeURIComponent(sample.slice(0, 120)) + "&display=swap";
      const cssResponse = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0",
        },
        cache: "force-cache",
        signal: AbortSignal.timeout(1400),
      });
      if (!cssResponse.ok) return null;
      const css = await cssResponse.text();
      const resource = css.match(/src:\s*url\((https:\/\/[^)]+)\)\s*format\('(truetype|opentype|woff)'\)/i);
      if (!resource?.[1]) return null;
      const fontResponse = await fetch(resource[1], {
        cache: "force-cache",
        signal: AbortSignal.timeout(1400),
      });
      if (!fontResponse.ok) return null;
      const fontData = await fontResponse.arrayBuffer();
      if (fontData.byteLength < 1000 || fontData.byteLength > 1500000) return null;
      return fontData;
    } catch {
      return null;
    }
  })();

  FONT_CACHE.set(key, pending);
  return pending;
}

export function isAnimatedGifAsset(value: string): boolean {
  try {
    return new URL(value).pathname.toLowerCase().endsWith(".gif");
  } catch {
    return false;
  }
}

export async function fetchStoredGifAsset(value: string): Promise<{ bytes: Buffer; delay?: number[]; loop?: number } | null> {
  if (!isAnimatedGifAsset(value)) return null;
  try {
    const assetUrl = new URL(value);
    const { url: supabaseUrl } = supabaseConfig();
    if (assetUrl.origin !== new URL(supabaseUrl).origin || !assetUrl.pathname.startsWith("/storage/v1/object/public/pixlo-assets/")) {
      return null;
    }
    const response = await fetch(assetUrl.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(4200),
    });
    if (!response.ok) return null;
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (contentType !== "image/gif") return null;
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > 25 * 1024 * 1024) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.byteLength > 25 * 1024 * 1024) return null;
    return { bytes };
  } catch {
    return null;
  }
}

async function embedStoredCoverImage(value: string): Promise<string> {
  if (!value) return "";
  try {
    const assetUrl = new URL(value);
    const { url: supabaseUrl } = supabaseConfig();
    if (assetUrl.origin !== new URL(supabaseUrl).origin || !assetUrl.pathname.startsWith("/storage/v1/object/public/pixlo-assets/")) {
      return value;
    }
    const response = await fetch(assetUrl.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) return value;
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!contentType.startsWith("image/") || contentType === "image/gif") return value;
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > 10 * 1024 * 1024) return value;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.byteLength > 10 * 1024 * 1024) return value;
    return "data:" + contentType + ";base64," + bytes.toString("base64");
  } catch {
    return value;
  }
}

function rgbaFromHex(hex: string, alpha: number) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "ffffff";
  const value = Number.parseInt(safe, 16);
  return "rgba(" + ((value >> 16) & 255) + "," + ((value >> 8) & 255) + "," + (value & 255) + "," + alpha + ")";
}

export async function renderShareCoverImage(
  profile: PublicProfileShareData | null,
  mode: RenderMode = "full",
): Promise<ImageResponse> {
  const username = profile?.username || "pixlo";
  const displayName = profile?.displayName || username || "Pixlo Profile";
  const avatarUrl = profile?.avatarUrl || "";
  const avatarDecorationUrl = profile?.avatarDecorationUrl || "";
  const backgroundImageUrl = mode === "full"
    ? profile?.shareCoverImageUrl || profile?.backgroundImageUrl || ""
    : "";
  const backgroundImageSourcePromise = embedStoredCoverImage(backgroundImageUrl);
  const baseNameSize = Math.min(130, (profile?.shareCoverNameSize ?? 66) * 1.18);
  const displayFontSize = displayName.length > 30
    ? Math.min(78, baseNameSize)
    : displayName.length > 21
      ? Math.min(100, baseNameSize)
      : baseNameSize;
  const nameColour = profile?.shareCoverNameColour || "#ffffff";
  const creditColour = profile?.shareCoverCreditColour || "#e3dcd8";
  const glowIntensity = Math.max(20, Math.min(200, profile?.shareCoverNameGlowIntensity ?? 65));
  const glowHex = /^#[0-9a-f]{6}$/i.test(nameColour) ? nameColour : "#ffffff";
  const red = Number.parseInt(glowHex.slice(1, 3), 16);
  const green = Number.parseInt(glowHex.slice(3, 5), 16);
  const blue = Number.parseInt(glowHex.slice(5, 7), 16);
  const glow = profile?.shareCoverNameGlow
    ? "0 0 " + Math.max(10, glowIntensity * 0.3) + "px rgba(" + red + "," + green + "," + blue + ",0.62), " +
      "0 0 " + Math.max(24, glowIntensity * 0.72) + "px rgba(" + red + "," + green + "," + blue + ",0.38), " +
      "0 0 " + Math.max(42, glowIntensity * 1.15) + "px rgba(" + red + "," + green + "," + blue + ",0.22)"
    : "none";
  const selectedFont = profileFontName(profile);
  const googleFont = FONT_ALIASES[selectedFont] || "Inter";
  const [backgroundImageSource, fontData] = await Promise.all([
    backgroundImageSourcePromise,
    loadGoogleFont(googleFont, displayName + " Made with Pixlo"),
  ]);
  const renderedFontFamily = fontData ? "PixloShareName" : "Arial, sans-serif";
  const fontOptions = fontData
    ? [{ name: "PixloShareName", data: fontData, weight: 800 as const, style: "normal" as const }]
    : [];
  const initials = (displayName || username || "P").slice(0, 1).toUpperCase();
  const showBackground = mode === "full" && Boolean(backgroundImageUrl);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          color: "#ffffff",
          fontFamily: renderedFontFamily,
          background: mode === "overlay" ? "transparent" : "linear-gradient(135deg, #09090b 0%, #21100d 55%, #41180f 100%)",
        }}
      >
        {showBackground && (
          <img
            src={backgroundImageSource}
            width="1200"
            height="630"
            style={{ position: "absolute", inset: 0, width: 1200, height: 630, objectFit: "cover" }}
          />
        )}
        {mode === "overlay" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(rgba(7,7,9,0.28), rgba(7,7,9,0.60))" }} />
        )}
        {showBackground && (
          <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(rgba(7,7,9,0.28), rgba(7,7,9,0.60))" }} />
        )}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", padding: "12px 54px" }}>
          <div style={{ width: 320, height: 320, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
            <div style={{ width: 264, height: 264, borderRadius: 132, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#fff", fontSize: 100, fontWeight: 700, border: "none", boxShadow: "none" }}>
              {avatarUrl ? (
                <img src={avatarUrl} width="264" height="264" style={{ width: 264, height: 264, objectFit: "cover", borderRadius: 132, border: "none", boxShadow: "none" }} />
              ) : initials}
            </div>
            {avatarDecorationUrl && <img src={avatarDecorationUrl} width="320" height="320" style={{ position: "absolute", inset: 0, width: 320, height: 320, objectFit: "contain", pointerEvents: "none" }} />}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", maxWidth: 1060, marginTop: 0, marginBottom: 0, color: nameColour, fontFamily: renderedFontFamily, fontSize: displayFontSize, fontWeight: 800, lineHeight: 1.1, overflowWrap: "anywhere", textShadow: glow }}>
            {displayName}
          </div>
          <div style={{ display: "flex", marginTop: 14, alignItems: "center", justifyContent: "center", color: creditColour, fontFamily: renderedFontFamily, fontSize: 22, fontWeight: 500 }}>
            Made with Pixlo
          </div>
        </div>
      </div>
    ),
    { ...SHARE_COVER_SIZE, fonts: fontOptions },
  );
}
