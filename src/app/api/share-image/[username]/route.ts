import { getPublicProfileShareData } from "../../../../lib/public-profile-share";
import {
  fetchStoredGifAsset,
  isAnimatedGifAsset,
  renderShareCoverImage,
} from "../../../../lib/share-cover-renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const responseHeaders = {
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username: rawUsername } = await params;
  const username = rawUsername.trim().toLowerCase();
  const profile = await getPublicProfileShareData(username);
  const coverUrl = profile?.shareCoverImageUrl || profile?.backgroundImageUrl || "";

  if (coverUrl && isAnimatedGifAsset(coverUrl)) {
    const gif = await fetchStoredGifAsset(coverUrl);

    if (gif) {
      try {
        const { default: sharp } = await import("sharp");
        // Social link previews need a reliably renderable cover. Use the GIF's first frame as
        // the background, then apply Pixlo's avatar/display-name overlay as a static PNG.
        const firstFrame = await sharp(gif.bytes, {
          failOn: "none",
          limitInputPixels: 100_000_000,
        })
          .resize(1200, 630, { fit: "cover", position: "centre" })
          .png()
          .toBuffer();
        const overlayResponse = await renderShareCoverImage(profile, "overlay");
        const overlayPng = Buffer.from(await overlayResponse.arrayBuffer());
        const output = await sharp(firstFrame)
          .composite([{ input: overlayPng, top: 0, left: 0, blend: "over" }])
          .png()
          .toBuffer();

        return new Response(output, {
          status: 200,
          headers: { ...responseHeaders, "Content-Type": "image/png" },
        });
      } catch {
        // If GIF decoding fails, fall through to a branded cover without the background asset.
      }
    }

    const safeProfile = profile ? {
      ...profile,
      shareCoverImageUrl: "",
      backgroundImageUrl: "",
      backgroundVideoUrl: "",
    } : null;
    const fallbackResponse = await renderShareCoverImage(safeProfile, "full");
    return new Response(await fallbackResponse.arrayBuffer(), {
      status: 200,
      headers: { ...responseHeaders, "Content-Type": "image/png" },
    });
  }

  const imageResponse = await renderShareCoverImage(profile, "full");
  return new Response(await imageResponse.arrayBuffer(), {
    status: 200,
    headers: { ...responseHeaders, "Content-Type": "image/png" },
  });
}
