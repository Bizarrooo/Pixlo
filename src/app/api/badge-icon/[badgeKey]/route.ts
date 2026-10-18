import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BADGE_ICON_FILES: Record<string, string> = {
  donor_supporter: "donor-supporter.svg",
  donor_patron: "donor-patron.svg",
  donor_benefactor: "donor-benefactor.svg",
  donor_sponsor: "donor-sponsor.svg",
  donor_elite_sponsor: "donor-elite-sponsor.svg",
  donor_mythic_patron: "donor-mythic-patron.svg",
  donor_eternal_benefactor: "donor-eternal-benefactor.svg",
  views_seen: "views-seen.svg",
  views_rising: "views-rising.svg",
  views_viral: "views-viral.svg",
  views_buzzing: "views-buzzing.svg",
  views_main_character: "views-main-character.svg",
  views_famous: "views-famous.svg",
  recruiter_scout: "recruiter-scout.svg",
  recruiter_recruiter: "recruiter-recruiter.svg",
  recruiter_senior_recruiter: "recruiter-senior-recruiter.svg",
  recruiter_lead_recruiter: "recruiter-lead-recruiter.svg",
  recruiter_elite_recruiter: "recruiter-elite-recruiter.svg",
};

export async function GET(_request: Request, context: { params: Promise<{ badgeKey: string }> }) {
  const { badgeKey } = await context.params;
  const fileName = BADGE_ICON_FILES[badgeKey];
  if (!fileName) return NextResponse.json({ error: "Badge icon not found." }, { status: 404 });

  try {
    let svg: Buffer;
    const filePath = path.join(process.cwd(), "public", "badges", fileName);
    try {
      svg = await readFile(filePath);
    } catch {
      // Serverless deployments may not bundle the public directory beside the route.
      // The filename comes only from the fixed allowlist above.
      const configuredOrigin = String(
        process.env.PIXLO_PUBLIC_ORIGIN ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://pixlo1.vercel.app"),
      ).replace(/\/$/, "");
      const iconResponse = await fetch(`${configuredOrigin}/badges/${fileName}`, { cache: "force-cache" });
      if (!iconResponse.ok) throw new Error(`Source badge icon returned HTTP ${iconResponse.status}`);
      svg = Buffer.from(await iconResponse.arrayBuffer());
    }

    const png = await sharp(svg, { density: 192 })
      .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[badge-icon] Could not render badge icon:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not render badge icon." }, { status: 500 });
  }
}
