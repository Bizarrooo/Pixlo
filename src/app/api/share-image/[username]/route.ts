import sharp from "sharp";
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
        const input = sharp(gif.bytes, { animated: true, failOn: "none", limitInputPixels: 100_000_000 });
        const metadata = await input.metadata();
        // Extremely long/large animations are passed through intact instead of exhausting the image function.
        if ((metadata.pages ?? 1) <= 160 && (metadata.width ?? 0) * (metadata.pageHeight ?? metadata.height ?? 0) <= 100_000_000) {
          const overlayResponse = await renderShareCoverImage(profile, "overlay");
          const overlayPng = Buffer.from(await overlayResponse.arrayBuffer());
          let animation = sharp(gif.bytes, { animated: true, failOn: "none", limitInputPixels: 100_000_000 })
            .resize(1200, 630, { fit: "cover", position: "centre" })
            .composite([{ input: overlayPng, top: 0, left: 0, blend: "over" }]);
          animation = animation.gif({ effort: 7, loop: metadata.loop ?? 0 });
          const output = await animation.toBuffer();
          return new Response(output, {
            status: 200,
            headers: { ...responseHeaders, "Content-Type": "image/gif" },
          });
        }
      } catch {
        // If this particular animation cannot be composited, still show its animation instead of a blank card.
      }
      return new Response(null, {
        status: 302,
        headers: { ...responseHeaders, Location: coverUrl },
      });
    }
  }

  const imageResponse = await renderShareCoverImage(profile, "full");
  return new Response(await imageResponse.arrayBuffer(), {
    status: 200,
    headers: { ...responseHeaders, "Content-Type": "image/png" },
  });
}
