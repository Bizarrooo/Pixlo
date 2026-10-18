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

  const [catalogResponse, awardsResponse, viewTierResponse, recruiterTierResponse, profileResponse] = await Promise.all([
    fetch(`${url}/rest/v1/badges?select=id,badge_key,name,description,icon_url,is_active&is_active=eq.true&order=created_at.asc`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/user_badges?select=badge_id,awarded_at&user_id=eq.${encodeURIComponent(user.id)}`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/pixlo_view_tiers?select=tier_key,badge_id,threshold_views&order=threshold_views.asc`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/pixlo_recruiter_tiers?select=tier_key,badge_id,threshold_invites&order=threshold_invites.asc`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/profiles?select=discord_id&id=eq.${encodeURIComponent(user.id)}&limit=1`, { headers, cache: "no-store" }),
  ]);

  if (!catalogResponse.ok) return NextResponse.json({ error: "Could not load the badge catalogue. Check the Pixlo badge database setup." }, { status: 503 });
  if (!awardsResponse.ok) return NextResponse.json({ error: "Could not load your earned badges." }, { status: 503 });

  const catalogRows = await catalogResponse.json().catch(() => []);
  const awardsRows = await awardsResponse.json().catch(() => []);
  const viewTierRows = viewTierResponse.ok ? await viewTierResponse.json().catch(() => []) : [];
  const recruiterTierRows = recruiterTierResponse.ok ? await recruiterTierResponse.json().catch(() => []) : [];
  const currentProfileRows = profileResponse.ok ? await profileResponse.json().catch(() => []) : [];
  const currentDiscordId = Array.isArray(currentProfileRows) && typeof currentProfileRows[0]?.discord_id === "string" ? currentProfileRows[0].discord_id : "";
  let totalInvites = 0;
  if (currentDiscordId) {
    const inviteCountResponse = await fetch(
      `${url}/rest/v1/pixlo_recruiter_invites?select=id&inviter_discord_id=eq.${encodeURIComponent(currentDiscordId)}&limit=1`,
      { headers: { ...headers, Prefer: "count=exact", Range: "0-0" }, cache: "no-store" },
    ).catch(() => null);
    const contentRange = inviteCountResponse?.headers.get("content-range") || "";
    const totalPart = contentRange.split("/")[1];
    if (totalPart && totalPart !== "*") totalInvites = Math.max(0, Number(totalPart) || 0);
  }
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

  const configuredTiers = (rows: unknown, field: "threshold_views" | "threshold_invites") => {
    const badgeById = new Map(catalog.map((badge: { id: string; badge_key: string; name: string; description: string; icon_url: string | null }) => [badge.id, badge]));
    return (Array.isArray(rows) ? rows : []).map((tier: Row) => {
      const badge = badgeById.get(String(tier.badge_id || "")) as { id: string; badge_key: string; name: string; description: string; icon_url: string | null } | undefined;
      if (!badge) return null;
      return { tier_key: String(tier.tier_key || ""), badge_id: badge.id, name: badge.name, description: badge.description, icon_url: badge.icon_url, [field]: Number(tier[field] || 0) };
    }).filter(Boolean);
  };
  return NextResponse.json({
    badges: earned,
    catalog,
    viewTiers: configuredTiers(viewTierRows, "threshold_views"),
    recruiterTiers: configuredTiers(recruiterTierRows, "threshold_invites"),
    totalInvites,
    discordLinked: Boolean(currentDiscordId),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
