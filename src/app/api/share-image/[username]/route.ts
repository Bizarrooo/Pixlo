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
  // The .gif suffix gives social-preview crawlers a clear image format hint.
  const username = rawUsername.trim().toLowerCase().replace(/\.gif$/i, "");
  const profile = await getPublicProfileShareData(username);
  const coverUrl = profile?.shareCoverImageUrl || profile?.backgroundImageUrl || "";

  if (coverUrl && isAnimatedGifAsset(coverUrl)) {
    const gif = await fetchStoredGifAsset(coverUrl);

    if (gif) {
      try {
        const { default: sharp } = await import("sharp");
        const animatedInput = sharp(gif.bytes, {
          animated: true,
          failOn: "none",
          limitInputPixels: 100_000_000,
        });
        const metadata = await animatedInput.metadata();

        // Composite the Pixlo avatar/name layer onto every frame when the GIF is manageable.
        if (
          (metadata.pages ?? 1) <= 160 &&
          (metadata.width ?? 0) * (metadata.pageHeight ?? metadata.height ?? 0) <= 100_000_000
        ) {
          const overlayResponse = await renderShareCoverImage(profile, "overlay");
          const overlayPng = Buffer.from(await overlayResponse.arrayBuffer());
          const output = await sharp(gif.bytes, {
            animated: true,
            failOn: "none",
            limitInputPixels: 100_000_000,
          })
            .resize(1200, 630, { fit: "cover", position: "centre" })
            .composite([{ input: overlayPng, top: 0, left: 0, blend: "over" }])
            .gif({ effort: 7, loop: metadata.loop ?? 0 })
            .toBuffer();

          return new Response(output, {
            status: 200,
            headers: { ...responseHeaders, "Content-Type": "image/gif" },
          });
        }
      } catch {
        // If animation compositing fails, keep the branded cover using a static GIF frame below.
      }

      try {
        const { default: sharp } = await import("sharp");
        const firstFrame = await sharp(gif.bytes, {
          failOn: "none",
          limitInputPixels: 100_000_000,
        })
          .resize(1200, 630, { fit: "cover", position: "centre" })
          .png()
          .toBuffer();
        const overlayResponse = await renderShareCoverImage(profile, "overlay");
        const overlayPng = Buffer.from(await overlayResponse.arrayBuffer());
        const stillGif = await sharp(firstFrame)
          .composite([{ input: overlayPng, top: 0, left: 0, blend: "over" }])
          .gif({ effort: 7, loop: 1 })
          .toBuffer();

        return new Response(stillGif, {
          status: 200,
          headers: { ...responseHeaders, "Content-Type": "image/gif" },
        });
      } catch {
        // Fall back to Pixlo's branded cover below if this GIF cannot be decoded.
      }
    }

    const safeProfile = profile ? {
      ...profile,
      shareCoverImageUrl: "",
      backgroundImageUrl: "",
      backgroundVideoUrl: "",
    } : null;
    const fallbackResponse = await renderShareCoverImage(safeProfile, "full");
    const fallbackPng = Buffer.from(await fallbackResponse.arrayBuffer());
    const { default: sharp } = await import("sharp");
    const fallbackGif = await sharp(fallbackPng).gif({ effort: 7, loop: 1 }).toBuffer();

    return new Response(fallbackGif, {
      status: 200,
      headers: { ...responseHeaders, "Content-Type": "image/gif" },
    });
  }

  const imageResponse = await renderShareCoverImage(profile, "full");
  return new Response(await imageResponse.arrayBuffer(), {
    status: 200,
    headers: { ...responseHeaders, "Content-Type": "image/png" },
  });
}
