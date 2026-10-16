import type { Metadata } from "next";
import ProfileView from "../../ProfileView";
import { getPublicProfileShareData, PIXLO_PUBLIC_ORIGIN } from "../../../lib/public-profile-share";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const username = rawUsername.trim().toLowerCase();
  const profile = await getPublicProfileShareData(username);
  const displayName = profile?.displayName || username || "Pixlo Profile";
  const profileUrl = `${PIXLO_PUBLIC_ORIGIN}/user/${encodeURIComponent(username)}`;
  const imageUrl = `${profileUrl}/opengraph-image`;
  const description = "Made with Pixlo";

  return {
    title: `${displayName} | Pixlo`,
    description,
    alternates: { canonical: profileUrl },
    openGraph: {
      type: "profile",
      siteName: "Pixlo",
      title: `${displayName} | Pixlo`,
      description,
      url: profileUrl,
      images: [{
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: `${displayName} — Made with Pixlo`,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} | Pixlo`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function UsernameProfile({ params }: PageProps) {
  const { username } = await params;
  return <ProfileView forcedUsername={username.trim().toLowerCase()} />;
}
