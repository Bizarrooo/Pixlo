import { ImageResponse } from "next/og";
import { getPublicProfileShareData } from "../../../lib/public-profile-share";
import { supabaseConfig } from "../../../lib/supabase-config";

async function embedPublicCoverImage(imageUrl: string): Promise<string> {
  if (!imageUrl) return "";
  try {
    const image = new URL(imageUrl);
    const { url: supabaseUrl } = supabaseConfig();
    const storageOrigin = new URL(supabaseUrl).origin;
    if (image.origin !== storageOrigin || !image.pathname.startsWith("/storage/v1/object/public/pixlo-assets/")) {
      return imageUrl;
    }
    const response = await fetch(image.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) return imageUrl;
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!contentType.startsWith("image/")) return imageUrl;
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 10 * 1024 * 1024) return imageUrl;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.byteLength > 10 * 1024 * 1024) return imageUrl;
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch {
    return imageUrl;
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const alt = "Profile avatar, display name and custom share cover — Made with Pixlo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ username: string }> }) {
  const { username: rawUsername } = await params;
  const username = rawUsername.trim().toLowerCase();
  const profile = await getPublicProfileShareData(username);
  const displayName = profile?.displayName || username || "Pixlo Profile";
  const avatarUrl = profile?.avatarUrl || "";
  const avatarDecorationUrl = profile?.avatarDecorationUrl || "";
  const backgroundImageUrl = profile?.shareCoverImageUrl || profile?.backgroundImageUrl || "";
  const backgroundImageSource = await embedPublicCoverImage(backgroundImageUrl);
  const preferredNameSize = Math.min(121, (profile?.shareCoverNameSize ?? 66) * 1.08);
  const displayFontSize = displayName.length > 30 ? Math.min(64, preferredNameSize) : displayName.length > 21 ? Math.min(84, preferredNameSize) : preferredNameSize;
  const nameColour = profile?.shareCoverNameColour || "#ffffff";
  const creditColour = profile?.shareCoverCreditColour || "#e3dcd8";
  const nameGlowIntensity = Math.max(20, profile?.shareCoverNameGlowIntensity ?? 65);
  const glowHex = /^#[0-9a-f]{6}$/i.test(nameColour) ? nameColour : "#ffffff";
  const glowRed = Number.parseInt(glowHex.slice(1, 3), 16);
  const glowGreen = Number.parseInt(glowHex.slice(3, 5), 16);
  const glowBlue = Number.parseInt(glowHex.slice(5, 7), 16);
  const nameTextShadow = profile?.shareCoverNameGlow
    ? `0 0 ${Math.max(10, nameGlowIntensity * 0.18)}px rgba(${glowRed}, ${glowGreen}, ${glowBlue}, ${Math.min(0.55, Math.max(0.3, nameGlowIntensity / 250))}), 0 0 ${Math.max(20, nameGlowIntensity * 0.38)}px rgba(${glowRed}, ${glowGreen}, ${glowBlue}, ${Math.min(0.32, Math.max(0.14, nameGlowIntensity / 650))})`
    : "none";
  const initial = (displayName || username || "P").slice(0, 1).toUpperCase();

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
          fontFamily: "Arial, sans-serif",
          background: "linear-gradient(135deg, #09090b 0%, #21100d 55%, #41180f 100%)",
        }}
      >
        {backgroundImageUrl && (
          <img
            src={backgroundImageSource}
            width="1200"
            height="630"
            style={{ position: "absolute", inset: 0, width: 1200, height: 630, objectFit: "cover" }}
          />
        )}
        {backgroundImageUrl && (
          <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(rgba(7,7,9,0.28), rgba(7,7,9,0.60))" }} />
        )}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", padding: "26px 70px" }}>
          <div style={{ width: 288, height: 288, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
            <div style={{ width: 238, height: 238, borderRadius: 119, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#fff", fontSize: 94, fontWeight: 700, border: "none", boxShadow: "none" }}>
              {avatarUrl ? (
                <img src={avatarUrl} width="238" height="238" style={{ width: 238, height: 238, objectFit: "cover", borderRadius: 119, border: "none", boxShadow: "none" }} />
              ) : initial}
            </div>
            {avatarDecorationUrl && <img src={avatarDecorationUrl} width="288" height="288" style={{ position: "absolute", inset: 0, width: 288, height: 288, objectFit: "contain", pointerEvents: "none" }} />}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", maxWidth: 1000, marginTop: 0, marginBottom: 0, color: nameColour, fontSize: displayFontSize, fontWeight: 800, lineHeight: 1.12, overflowWrap: "anywhere", textShadow: nameTextShadow }}>
            {displayName}
          </div>
          <div style={{ display: "flex", marginTop: 12, alignItems: "center", justifyContent: "center", color: creditColour, fontSize: 20, fontWeight: 500 }}>
            Made with Pixlo
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
