import { getPublicProfileShareData, type PublicProfileShareData } from "../../../../lib/public-profile-share";
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

function withoutGifBackground(profile: PublicProfileShareData | null): PublicProfileShareData | null {
  return profile ? {
    ...profile,
    shareCoverImageUrl: "",
    backgroundImageUrl: "",
    backgroundVideoUrl: "",
  } : null;
}

async function renderGifCoverFallback(
  profile: PublicProfileShareData | null,
  gifBytes?: Buffer,
): Promise<Response> {
  const safeProfile = withoutGifBackground(profile);
  try {
    const { default: sharp } = await import("sharp");
    let coverBytes: Buffer;

    if (gifBytes?.length) {
      // If animation compositing fails or the GIF is too large, keep its first frame and still
      // paint the avatar/name cover on top. Never return the raw GIF without Pixlo's cover.
      const firstFrame = await sharp(gifBytes, {
        page: 0,
        animated: false,
        failOn: "none",
        limitInputPixels: 100_000_000,
      })
        .resize(1200, 630, { fit: "cover", position: "centre" })
        .png()
        .toBuffer();
      const overlayResponse = await renderShareCoverImage(safeProfile, "overlay");
      const overlayPng = Buffer.from(await overlayResponse.arrayBuffer());
      coverBytes = await sharp(firstFrame)
        .composite([{ input: overlayPng, top: 0, left: 0, blend: "over" }])
        .gif({ effort: 7, loop: 1 })
        .toBuffer();
    } else {
      // If the GIF cannot be downloaded, still return a branded profile cover rather than
      // redirecting social crawlers to a bare background GIF.
      const imageResponse = await renderShareCoverImage(safeProfile, "full");
      coverBytes = await sharp(Buffer.from(await imageResponse.arrayBuffer()))
        .gif({ effort: 7, loop: 1 })
        .toBuffer();
    }

    return new Response(coverBytes, {
      status: 200,
      headers: { ...responseHeaders, "Content-Type": "image/gif" },
    });
  } catch {
    // Last-resort fallback if GIF encoding is unavailable: return a valid PNG cover with the
    // GIF removed, so the avatar and display name remain visible.
    const imageResponse = await renderShareCoverImage(safeProfile, "full");
    return new Response(await imageResponse.arrayBuffer(), {
      status: 200,
      headers: { ...responseHeaders, "Content-Type": "image/png" },
    });
  }
}

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
    if (!gif) return renderGifCoverFallback(profile);

    try {
      const { default: sharp } = await import("sharp");
      const input = sharp(gif.bytes, {
        animated: true,
        failOn: "none",
        limitInputPixels: 100_000_000,
      });
      const metadata = await input.metadata();

      // Small enough animations stay animated. Bigger animations use a first-frame cover
      // fallback below instead of dropping the avatar/name overlay.
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
      // Try a still-frame cover below. Do not return the original GIF without the cover.
    }

    return renderGifCoverFallback(profile, gif.bytes);
  }

  const imageResponse = await renderShareCoverImage(profile, "full");
  return new Response(await imageResponse.arrayBuffer(), {
    status: 200,
    headers: { ...responseHeaders, "Content-Type": "image/png" },
  });
}
