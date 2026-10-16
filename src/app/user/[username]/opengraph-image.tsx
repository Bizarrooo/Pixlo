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
  const avatarUrl = profile?.avatarUrl || "";
  const displayFontSize = displayName.length > 30 ? 44 : displayName.length > 21 ? 54 : 66;
  const initial = (displayName || username || "P").slice(0, 1).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
          color: "#ffffff",
          background: "linear-gradient(125deg, #09090b 0%, #141011 54%, #1e100b 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -140,
            top: -260,
            width: 760,
            height: 760,
            borderRadius: 500,
            background: "radial-gradient(circle, rgba(255, 76, 43, 0.30) 0%, rgba(255, 117, 45, 0.12) 42%, rgba(255, 117, 45, 0) 72%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 26,
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 30,
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 48,
            width: "100%",
            padding: "76px 92px",
            position: "relative",
          }}
        >
          <div
            style={{
              width: 208,
              height: 208,
              flex: "0 0 208px",
              borderRadius: 104,
              padding: 7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(145deg, #ff4f32, #ff9c3a)",
              boxShadow: "0 18px 62px rgba(255, 81, 44, 0.28)",
            }}
          >
            <div
              style={{
                width: 194,
                height: 194,
                borderRadius: 97,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                background: "#211717",
                color: "#ffffff",
                fontSize: 84,
                fontWeight: 700,
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  width="194"
                  height="194"
                  style={{ width: 194, height: 194, objectFit: "cover", borderRadius: 97 }}
                />
              ) : (
                initial
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                color: "#ff9659",
                fontSize: 25,
                fontWeight: 700,
                letterSpacing: 2,
                marginBottom: 15,
              }}
            >
              @{profile?.username || username}
            </div>
            <div
              style={{
                display: "flex",
                maxWidth: 690,
                color: "#ffffff",
                fontSize: displayFontSize,
                fontWeight: 800,
                letterSpacing: -1.5,
                lineHeight: 1.12,
                overflowWrap: "anywhere",
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                marginTop: 30,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  color: "#ffffff",
                  fontSize: 22,
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #f04432 0%, #ff9a38 100%)",
                  boxShadow: "0 5px 20px rgba(255, 86, 45, 0.25)",
                }}
              >
                P
              </div>
              <div style={{ display: "flex", fontSize: 25, fontWeight: 600, color: "#e8e3e1" }}>
                Made with Pixlo
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 64,
            bottom: 48,
            color: "rgba(255,255,255,0.45)",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 4,
            display: "flex",
          }}
        >
          PIXLO
        </div>
      </div>
    ),
    { ...size },
  );
}
