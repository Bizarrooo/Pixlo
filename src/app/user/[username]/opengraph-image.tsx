import { ImageResponse } from "next/og";
import { getPublicProfileShareData } from "../../../lib/public-profile-share";

export const runtime = "nodejs";
export const alt = "Pixlo profile preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ username: string }> }) {
  const { username: rawUsername } = await params;
  const username = rawUsername.trim().toLowerCase();
  const profile = await getPublicProfileShareData(username);
  const displayName = profile?.displayName || username || "Pixlo Profile";
  const avatarUrl = profile?.avatarUrl || "";\n  const backgroundImageUrl = profile?.backgroundImageUrl || "";
  const displayFontSize = displayName.length > 30 ? 44 : displayName.length > 21 ? 54 : 66;
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
          background: backgroundImageUrl
            ? `linear-gradient(rgba(7,7,9,0.42), rgba(7,7,9,0.62)), url("${backgroundImageUrl}") center / cover no-repeat`
            : "linear-gradient(135deg, #09090b 0%, #21100d 55%, #41180f 100%)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "radial-gradient(circle at 50% 35%, rgba(255,95,48,0.17), transparent 54%)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", padding: "42px 90px" }}>
          <div style={{ width: 218, height: 218, borderRadius: 109, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(20,15,15,0.8)", color: "#fff", fontSize: 86, fontWeight: 700 }}>
            {avatarUrl ? (
              <img src={avatarUrl} width="218" height="218" style={{ width: 218, height: 218, objectFit: "cover", borderRadius: 109 }} />
            ) : initial}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", maxWidth: 1000, marginTop: 24, color: "#ffffff", fontSize: displayFontSize, fontWeight: 800, lineHeight: 1.12, overflowWrap: "anywhere" }}>
            {displayName}
          </div>
          <div style={{ display: "flex", marginTop: 18, alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.88)", fontSize: 25, fontWeight: 500 }}>
            (Made with Pixlo)
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
