import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../lib/supabase-config";
import { serverEnv } from "../../../lib/server-env";

export const runtime = "nodejs";
export const revalidate = 300;

const OWNER_USER_ID = "3f29f647-4b99-4f53-adf0-eb678bef1c5f";
const PAGE_SIZE = 1000;

type ViewRow = { username?: string; views?: string | number | null };

function totalFromContentRange(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}


async function countPremiumMembers(url: string, serviceKey: string): Promise<number | null> {
  try {
    const liveMode = Boolean(serverEnv("STRIPE_SECRET_KEY")?.startsWith("sk_live_"));
    const response = await fetch(
      `${url}/rest/v1/pixlo_premium_entitlements?select=user_id&user_id=neq.${OWNER_USER_ID}&status=eq.active&livemode=eq.${liveMode}&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: "count=exact",
          Range: "0-0",
        },
        next: { revalidate: 300 },
      },
    );
    if (!response.ok) return null;
    await response.json().catch(() => []);
    return (totalFromContentRange(response.headers.get("content-range")) ?? 0) + 1;
  } catch {
    return null;
  }
}
export async function GET() {
  try {
    const { url } = supabaseConfig();
    const publicHeaders = { ...authHeaders(), Prefer: "count=exact" };
    const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
    const premiumMembersPromise = serviceKey ? countPremiumMembers(url, serviceKey) : Promise.resolve(null);

    let offset = 0;
    let members: number | null = null;
    let totalProfileViews = 0;
    let totalRows = 0;

    // Only request the username and the JSON views value, never each full profile configuration.
    while (offset < 100_000) {
      const query = new URLSearchParams({
        select: "username,views:settings->>views",
        limit: String(PAGE_SIZE),
      });
      const response = await fetch(
        `${url}/rest/v1/profiles?${query.toString()}`,
        {
          headers: { ...publicHeaders, Range: `${offset}-${offset + PAGE_SIZE - 1}` },
          next: { revalidate: 300 },
        },
      );
      if (!response.ok) {
        return NextResponse.json({ error: "Site statistics are temporarily unavailable." }, { status: 503 });
      }
      const rows = (await response.json()) as ViewRow[];
      if (members === null) members = totalFromContentRange(response.headers.get("content-range"));
      totalRows += rows.length;
      for (const row of rows) {
        totalProfileViews += Math.max(0, Number(row.views ?? 0) || 0);
      }
      if (rows.length < PAGE_SIZE || (members !== null && offset + rows.length >= members)) break;
      offset += PAGE_SIZE;
    }

    const premiumMembers = await premiumMembersPromise;

    return NextResponse.json(
      {
        totalProfileViews,
        members: members ?? totalRows,
        premiumMembers,
        fileUploads: null,
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch {
    return NextResponse.json({ error: "Site statistics are temporarily unavailable." }, { status: 500 });
  }
}
