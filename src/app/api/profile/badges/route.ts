import { NextResponse } from "next/server";
import { serverEnv } from "../../../../lib/server-env";
import { supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

type Row = Record<string, unknown>;

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const value = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] || "";
  try { return decodeURIComponent(value); } catch { return value; }
}

export async function GET(request: Request) {
  const accessToken = cookieValue(request, "pixlo_access_token");
  if (!accessToken) return NextResponse.json({ error: "Sign in to view your badges." }, { status: 401 });

  const { url, key } = supabaseConfig();
  const authResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!authResponse.ok) return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
  const user = await authResponse.json().catch(() => null);
  if (typeof user?.id !== "string") return NextResponse.json({ error: "Could not verify your Pixlo account." }, { status: 401 });

  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return NextResponse.json({ error: "Badge storage is not configured on the server." }, { status: 503 });
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  const [catalogResponse, awardsResponse] = await Promise.all([
    fetch(`${url}/rest/v1/badges?select=id,badge_key,name,description,icon_url,is_active&is_active=eq.true&order=created_at.asc`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/user_badges?select=badge_id,awarded_at&user_id=eq.${encodeURIComponent(user.id)}`, { headers, cache: "no-store" }),
  ]);

  if (!catalogResponse.ok) return NextResponse.json({ error: "Could not load the badge catalogue. Check the Pixlo badge database setup." }, { status: 503 });
  if (!awardsResponse.ok) return NextResponse.json({ error: "Could not load your earned badges." }, { status: 503 });

  const catalogRows = await catalogResponse.json().catch(() => []);
  const awardsRows = await awardsResponse.json().catch(() => []);
  const catalog = (Array.isArray(catalogRows) ? catalogRows : []).map((row: Row) => ({
    id: String(row.id || ""),
    badge_key: String(row.badge_key || ""),
    name: String(row.name || "Badge"),
    description: String(row.description || ""),
    icon_url: typeof row.icon_url === "string" ? row.icon_url : null,
  })).filter((badge: { id: string }) => Boolean(badge.id));

  const awards = new Map<string, string>();
  for (const award of (Array.isArray(awardsRows) ? awardsRows : []) as Row[]) {
    const badgeId = typeof award.badge_id === "string" ? award.badge_id : "";
    if (badgeId && !awards.has(badgeId)) awards.set(badgeId, typeof award.awarded_at === "string" ? award.awarded_at : "");
  }
  const catalogById = new Map(catalog.map((badge: { id: string }) => [badge.id, badge]));
  const earned = [...awards.entries()]
    .map(([id, awardedAt]) => {
      const badge = catalogById.get(id);
      return badge ? { ...badge, awarded_at: awardedAt } : null;
    })
    .filter((badge): badge is NonNullable<typeof badge> => badge !== null);

  return NextResponse.json({ badges: earned, catalog }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
