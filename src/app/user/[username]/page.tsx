import type { Metadata } from "next";
import ProfileView from "../../ProfileView";
import { getPublicProfileShareData, PIXLO_PUBLIC_ORIGIN } from "../../../lib/public-profile-share";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ username: string }> };

function shareVersion(parts: string[]) {
  let hash = 2166136261;
  for (const character of parts.join("|")) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  return hash.toString(36);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const username = rawUsername.trim().toLowerCase();
  const profile = await getPublicProfileShareData(username);
  const displayName = profile?.displayName || username || "Pixlo Profile";
  const profileUrl = `${PIXLO_PUBLIC_ORIGIN}/user/${encodeURIComponent(username)}`;
  const version = shareVersion([
    displayName,
    profile?.avatarUrl || "",
    profile?.avatarDecorationUrl || "",
    profile?.shareCoverImageUrl || "",
    String(profile?.shareCoverNameSize ?? 66),
    String(profile?.shareCoverNameGlow ?? false),
    String(profile?.shareCoverNameGlowIntensity ?? 65),
    profile?.shareCoverNameGlowColour || "",
    profile?.backgroundImageUrl || "",
    profile?.backgroundVideoUrl || "",
  ]);
  const imageUrl = `${profileUrl}/opengraph-image?v=${version}`;
  const description = "Made with Pixlo";
  const backgroundVideoUrl = profile?.backgroundVideoUrl || "";
  const videoPath = backgroundVideoUrl.split("?")[0].toLowerCase();
  const videoType = videoPath.endsWith(".webm") ? "video/webm" : videoPath.endsWith(".mov") ? "video/quicktime" : "video/mp4";

  return {
    title: displayName,
    description,
    alternates: { canonical: profileUrl },
    openGraph: {
      type: "profile",
      siteName: "Pixlo",
      title: displayName,
      description,
      url: profileUrl,
      images: [{
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: `${displayName} — Made with Pixlo`,
      }],
      ...(backgroundVideoUrl ? { videos: [{ url: backgroundVideoUrl, secureUrl: backgroundVideoUrl, type: videoType, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: displayName,
      description,
      images: [imageUrl],
    },
  };
}

export default async function UsernameProfile({ params }: PageProps) {
  const { username } = await params;
  return <ProfileView forcedUsername={username.trim().toLowerCase()} />;
}
