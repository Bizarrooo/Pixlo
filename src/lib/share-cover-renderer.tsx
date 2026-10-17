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
  "Lexend": "Lexend",
  "Urbanist": "Urbanist",
  "Sora": "Sora",
  "Lato": "Lato",
  "Roboto": "Roboto",
  "Roboto Condensed": "Roboto Condensed",
  "Nunito": "Nunito",
  "Nunito Sans": "Nunito Sans",
  "Mulish": "Mulish",
  "Work Sans": "Work Sans",
  "Archivo": "Archivo",
  "Exo 2": "Exo 2",
  "Merriweather": "Merriweather",
  "Lora": "Lora",
  "Source Sans 3": "Source Sans 3",
  "Source Code Pro": "Source Code Pro",
  "IBM Plex Sans": "IBM Plex Sans",
  "IBM Plex Mono": "IBM Plex Mono",
  "Comfortaa": "Comfortaa",
  "Figtree": "Figtree",
  "Karla": "Karla",
  "Asap": "Asap",
  "Libre Franklin": "Libre Franklin",
  "Oxygen": "Oxygen",
  "Barlow": "Barlow",
  "Barlow Condensed": "Barlow Condensed",
  "Josefin Sans": "Josefin Sans",
  "Cabin": "Cabin",
  "Jost": "Jost",
  "Spectral": "Spectral",
  "Cinzel": "Cinzel",
  "Anton": "Anton",
  "Bricolage Grotesque": "Bricolage Grotesque",
  "DM Serif Display": "DM Serif Display",
  "IBM Plex Serif": "IBM Plex Serif",
  "Onest": "Onest",
  "Righteous": "Righteous",
  "Space Mono": "Space Mono",
  "Titillium Web": "Titillium Web",
  "Ubuntu": "Ubuntu",
  "Yeseva One": "Yeseva One",
  "Zilla Slab": "Zilla Slab",
  "Archivo Black": "Archivo Black",
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
    const isPixloStorageAsset =
      assetUrl.origin === new URL(supabaseUrl).origin &&
      assetUrl.pathname.startsWith("/storage/v1/object/public/pixlo-assets/");

    // Keep remote standard image URLs usable, but never hand an animated GIF directly to
    // ImageResponse: social covers are deliberately static, including when the source is a GIF.
    if (!isPixloStorageAsset) {
      return /\.gif$/i.test(assetUrl.pathname) ? "" : value;
    }

    const response = await fetch(assetUrl.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(5500),
    });
    if (!response.ok) return "";
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const extensionLooksLikeImage = /\.(?:avif|bmp|gif|jpe?g|png|tiff?|webp)$/i.test(assetUrl.pathname);
    if (!contentType.startsWith("image/") && !extensionLooksLikeImage) return "";

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > 25 * 1024 * 1024) return "";
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.byteLength > 25 * 1024 * 1024) return "";

    // Decode only the first frame/page, resize before embedding, and normalise every supported
    // upload format (GIF/AVIF/WebP/PNG/JPEG) to PNG. This makes Open Graph rendering deterministic.
    const { default: sharp } = await import("sharp");
    const staticPng = await sharp(bytes, {
      animated: false,
      failOn: "none",
      limitInputPixels: 100_000_000,
    })
      .rotate()
      .resize(1200, 630, { fit: "cover", position: "centre", withoutEnlargement: true })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    return "data:image/png;base64," + staticPng.toString("base64");
  } catch {
    // Keep the rest of the share cover renderable even if a background upload is unsupported.
    return "";
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
  const isPremium = Boolean(profile?.isPremium);
  const displayName = profile?.displayName || username || "Pixlo Profile";
  const avatarUrl = profile?.avatarUrl || "";
  const avatarDecorationUrl = profile?.avatarDecorationUrl || "";
  const backgroundImageUrl = mode === "full" && isPremium
    ? profile?.shareCoverImageUrl || profile?.backgroundImageUrl || ""
    : "";
  const backgroundImageSourcePromise = embedStoredCoverImage(backgroundImageUrl);
  const baseNameSize = Math.min(130, (profile?.shareCoverNameSize ?? 66) * 1.18);
  const displayFontSize = displayName.length > 30
    ? Math.min(78, baseNameSize)
    : displayName.length > 21
      ? Math.min(100, baseNameSize)
      : baseNameSize;
  const nameColour = isPremium ? (profile?.shareCoverNameColour || "#ffffff") : "#ffffff";
  const creditColour = isPremium ? (profile?.shareCoverCreditColour || "#ffffff") : "#ffffff";
  const nameGradientEnabled = isPremium && profile?.shareCoverNameGradientEnabled === true;
  const creditGradientEnabled = isPremium && profile?.shareCoverCreditGradientEnabled === true;
  const nameGradientColours = profile?.shareCoverNameGradientColours || ["#ff8a00", "#ff3e5f", "#b14dff"];
  const creditGradientColours = profile?.shareCoverCreditGradientColours || ["#ffffff", "#ffd2b4", "#ffffff"];
  const glowIntensity = Math.max(0, Math.min(200, profile?.shareCoverNameGlowIntensity ?? 65));
  const glowHex = /^#[0-9a-f]{6}$/i.test(nameGradientEnabled ? nameGradientColours[1] : nameColour) ? (nameGradientEnabled ? nameGradientColours[1] : nameColour) : "#ffffff";
  const red = Number.parseInt(glowHex.slice(1, 3), 16);
  const green = Number.parseInt(glowHex.slice(3, 5), 16);
  const blue = Number.parseInt(glowHex.slice(5, 7), 16);
  const glowEnabled = isPremium && profile?.shareCoverNameGlow === true && glowIntensity > 0;
  const glow = glowEnabled ? "0 0 " + Math.max(24, glowIntensity * 0.75) + "px rgba(" + red + "," + green + "," + blue + ",1), 0 0 " + Math.max(48, glowIntensity * 1.35) + "px rgba(" + red + "," + green + "," + blue + ",0.9), 0 0 " + Math.max(72, glowIntensity * 1.9) + "px rgba(" + red + "," + green + "," + blue + ",0.62)" : "none";
  const glowFilter = glowEnabled
    ? "drop-shadow(0 0 " + Math.max(18, glowIntensity * 0.6) + "px rgba(" + red + "," + green + "," + blue + ",0.98)) drop-shadow(0 0 " + Math.max(36, glowIntensity * 1.1) + "px rgba(" + red + "," + green + "," + blue + ",0.72)) drop-shadow(0 0 " + Math.max(60, glowIntensity * 1.6) + "px rgba(" + red + "," + green + "," + blue + ",0.45))"
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
  const showBackground = mode === "full" && isPremium && Boolean(backgroundImageUrl);

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
          background: mode === "overlay" ? "transparent" : "linear-gradient(135deg, #ff8a00 0%, #ff5a00 48%, #ee2b42 100%)",
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", maxWidth: 1060, marginTop: 0, marginBottom: 0, color: nameGradientEnabled ? "transparent" : nameColour, backgroundImage: nameGradientEnabled ? "linear-gradient(90deg, " + nameGradientColours.join(", ") + ")" : "none", backgroundClip: nameGradientEnabled ? "text" : "border-box", WebkitBackgroundClip: nameGradientEnabled ? "text" : "border-box", fontFamily: renderedFontFamily, fontSize: displayFontSize, fontWeight: 800, lineHeight: 1.1, overflowWrap: "anywhere", textShadow: glow, filter: glowFilter }}>
            {displayName}
          </div>
          <div style={{ display: "flex", marginTop: 14, alignItems: "center", justifyContent: "center", color: creditGradientEnabled ? "transparent" : creditColour, backgroundImage: creditGradientEnabled ? "linear-gradient(90deg, " + creditGradientColours.join(", ") + ")" : "none", backgroundClip: creditGradientEnabled ? "text" : "border-box", WebkitBackgroundClip: creditGradientEnabled ? "text" : "border-box", fontFamily: renderedFontFamily, fontSize: 22, fontWeight: 500 }}>
            Made with Pixlo
          </div>
        </div>
      </div>
    ),
    { ...SHARE_COVER_SIZE, fonts: fontOptions },
  );
}
