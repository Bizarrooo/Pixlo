import type { Metadata } from "next";
import ProfileView from "../../ProfileView";
import { getPublicProfileShareData, PIXLO_PUBLIC_ORIGIN } from "../../../lib/public-profile-share";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ username: string }>; searchParams?: Promise<{ share?: string | string[] }> };

function shareVersion(parts: string[]) {
  let hash = 2166136261;
  for (const character of parts.join("|")) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  return hash.toString(36);
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const query = searchParams ? await searchParams : {};
  const requestedShareKey = Array.isArray(query.share) ? query.share[0] : query.share;
  const shareKey = typeof requestedShareKey === "string" && /^[a-z0-9_-]{1,32}$/i.test(requestedShareKey) ? requestedShareKey : "";
  const username = rawUsername.trim().toLowerCase();
  const profile = await getPublicProfileShareData(username);
  const displayName = profile?.displayName || username || "Pixlo Profile";
  const profileUrl = `${PIXLO_PUBLIC_ORIGIN}/user/${encodeURIComponent(username)}`;
  const version = shareVersion([
    displayName,
    profile?.avatarUrl || "",
    profile?.avatarDecorationUrl || "",
    profile?.shareCoverImageUrl || "",
    profile?.nameFont || "Inter",
    String(profile?.shareCoverNameSize ?? 66),
    profile?.shareCoverNameColour || "",
    profile?.shareCoverCreditColour || "",
    String(profile?.shareCoverNameGlow ?? false),
    String(profile?.shareCoverNameGlowIntensity ?? 65),
    profile?.shareCoverNameGlowColour || "",
    profile?.backgroundImageUrl || "",
    profile?.backgroundVideoUrl || "",
  ]);
  const shareUrl = shareKey ? `${profileUrl}?share=${encodeURIComponent(shareKey)}` : profileUrl;
  const coverAssetUrl = profile?.shareCoverImageUrl || profile?.backgroundImageUrl || "";
  const isGifCover = (() => { try { return new URL(coverAssetUrl).pathname.toLowerCase().endsWith(".gif"); } catch { return false; } })();
  const staticImageUrl = `${profileUrl}/opengraph-image?v=${version}${shareKey ? `&share=${encodeURIComponent(shareKey)}` : ""}`;
  const animatedImageUrl = `${PIXLO_PUBLIC_ORIGIN}/api/share-image/${encodeURIComponent(username)}?v=${version}${shareKey ? `&share=${encodeURIComponent(shareKey)}` : ""}`;
  const imageUrl = isGifCover ? animatedImageUrl : staticImageUrl;
  const imageType = isGifCover ? "image/gif" : "image/png";
  const description = "Made with Pixlo";

  return {
    title: displayName,
    description,
    alternates: { canonical: shareKey ? shareUrl : profileUrl },
    openGraph: {
      type: "profile",
      siteName: "Pixlo",
      title: displayName,
      description,
      url: shareUrl,
      images: [{
        url: imageUrl,
        width: 1200,
        height: 630,
        type: imageType,
        alt: `${displayName} — Made with Pixlo`,
      }],
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
