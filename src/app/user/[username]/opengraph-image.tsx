import { ImageResponse } from "next/og";
import { getPublicProfileShareData } from "../../../lib/public-profile-share";

export const runtime = "nodejs";
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
  const preferredNameSize = profile?.shareCoverNameSize ?? 66;
  const displayFontSize = displayName.length > 30 ? Math.min(58, preferredNameSize) : displayName.length > 21 ? Math.min(76, preferredNameSize) : preferredNameSize;
  const nameGlowIntensity = profile?.shareCoverNameGlowIntensity ?? 65;
  const glowHex = profile?.shareCoverNameGlowColour || "#ff6946";
  const glowRed = Number.parseInt(glowHex.slice(1,3), 16);
  const glowGreen = Number.parseInt(glowHex.slice(3,5), 16);
  const glowBlue = Number.parseInt(glowHex.slice(5,7), 16);
  const nameTextShadow = profile?.shareCoverNameGlow
    ? `0 0 ${Math.max(1, nameGlowIntensity * 0.55)}px rgba(${glowRed}, ${glowGreen}, ${glowBlue}, ${Math.min(0.95, nameGlowIntensity / 100)}), 0 0 ${nameGlowIntensity}px rgba(${glowRed}, ${glowGreen}, ${glowBlue}, ${Math.min(0.45, nameGlowIntensity / 300)})`
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
            src={backgroundImageUrl}
            width="1200"
            height="630"
            style={{ position: "absolute", inset: 0, width: 1200, height: 630, objectFit: "cover" }}
          />
        )}
        {backgroundImageUrl && (
          <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(rgba(7,7,9,0.28), rgba(7,7,9,0.60))" }} />
        )}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", padding: "26px 70px" }}>
          <div style={{ width: 264, height: 264, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
            <div style={{ width: 218, height: 218, borderRadius: 109, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#fff", fontSize: 86, fontWeight: 700, border: "none", boxShadow: "none" }}>
              {avatarUrl ? (
                <img src={avatarUrl} width="218" height="218" style={{ width: 218, height: 218, objectFit: "cover", borderRadius: 109, border: "none", boxShadow: "none" }} />
              ) : initial}
            </div>
            {avatarDecorationUrl && <img src={avatarDecorationUrl} width="264" height="264" style={{ position: "absolute", inset: 0, width: 264, height: 264, objectFit: "contain", pointerEvents: "none" }} />}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", maxWidth: 1000, marginTop: 8, color: "#ffffff", fontSize: displayFontSize, fontWeight: 800, lineHeight: 1.12, overflowWrap: "anywhere", textShadow: nameTextShadow }}>
            {displayName}
          </div>
          <div style={{ display: "flex", marginTop: 12, alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.88)", fontSize: 18, fontWeight: 500 }}>
            Made with Pixlo
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
