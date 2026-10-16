import { renderShareCoverImage, SHARE_COVER_SIZE } from "../../../lib/share-cover-renderer";
import { getPublicProfileShareData } from "../../../lib/public-profile-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const alt = "Profile avatar, display name and custom share cover — Made with Pixlo";
export const size = SHARE_COVER_SIZE;
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: rawUsername } = await params;
  const username = rawUsername.trim().toLowerCase();
  const profile = await getPublicProfileShareData(username);
  return renderShareCoverImage(profile, "full");
}
