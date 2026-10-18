import { NextResponse } from "next/server";
import { serverEnv } from "../../../../lib/server-env";
import { supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

const DONOR_TIERS = [
  { key: "donor_supporter", name: "Supporter", amountPence: 500 },
  { key: "donor_patron", name: "Patron", amountPence: 1500 },
  { key: "donor_benefactor", name: "Benefactor", amountPence: 3000 },
  { key: "donor_sponsor", name: "Sponsor", amountPence: 5000 },
  { key: "donor_elite_sponsor", name: "Elite Sponsor", amountPence: 10000 },
  { key: "donor_mythic_patron", name: "Mythic Patron", amountPence: 25000 },
  { key: "donor_eternal_benefactor", name: "Eternal Benefactor", amountPence: 50000 },
] as const;

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const value = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] || "";
  try { return decodeURIComponent(value); } catch { return value; }
}

export async function GET(request: Request) {
  const accessToken = cookieValue(request, "pixlo_access_token");
  if (!accessToken) {
    return NextResponse.json({ authenticated: false, totalDonatedPence: 0 }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const { url, key } = supabaseConfig();
  const authResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!authResponse.ok) {
    return NextResponse.json({ authenticated: false, totalDonatedPence: 0 }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
  const user = await authResponse.json().catch(() => null);
  if (typeof user?.id !== "string") {
    return NextResponse.json({ authenticated: false, totalDonatedPence: 0 }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return NextResponse.json({ error: "Donor tier storage is not configured." }, { status: 503 });

  const liveMode = Boolean(serverEnv("STRIPE_SECRET_KEY")?.startsWith("sk_live_"));
  const donationsResponse = await fetch(
    `${url}/rest/v1/pixlo_donations?select=amount_pence&user_id=eq.${encodeURIComponent(user.id)}&livemode=eq.${liveMode}`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" },
  );
  if (!donationsResponse.ok) {
    const detail = await donationsResponse.text().catch(() => "");
    console.error("[donations/status] Could not read donor history:", donationsResponse.status, detail.slice(0, 250));
    return NextResponse.json({ error: "Could not load your donor tier." }, { status: 503 });
  }

  const rows = await donationsResponse.json().catch(() => []);
  const totalDonatedPence = Array.isArray(rows)
    ? rows.reduce((total: number, row: { amount_pence?: unknown }) => total + (Number.isInteger(Number(row.amount_pence)) ? Number(row.amount_pence) : 0), 0)
    : 0;
  const tierKeys = DONOR_TIERS.map(tier => tier.key);
  const badgesQuery = new URLSearchParams({
    select: "id,badge_key",
    is_active: "eq.true",
    badge_key: `in.(${tierKeys.join(",")})`,
  });
  const badgeResponse = await fetch(`${url}/rest/v1/badges?${badgesQuery.toString()}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store",
  });
  if (!badgeResponse.ok) {
    const detail = await badgeResponse.text().catch(() => "");
    console.error("[donations/status] Could not read donor badge definitions:", badgeResponse.status, detail.slice(0, 250));
    return NextResponse.json({ error: "Donor badge setup is incomplete." }, { status: 503 });
  }
  const badgeRows = await badgeResponse.json().catch(() => []);
  const badgeDefinitions = Array.isArray(badgeRows)
    ? badgeRows.filter((badge: { id?: unknown; badge_key?: unknown }) => typeof badge.id === "string" && typeof badge.badge_key === "string")
    : [];
  if (badgeDefinitions.length !== DONOR_TIERS.length) {
    return NextResponse.json({ error: "Donor badge setup is incomplete." }, { status: 503 });
  }

  const badgeIds = badgeDefinitions.map((badge: { id: string }) => badge.id);
  const awardedQuery = new URLSearchParams({
    select: "badge_id",
    user_id: `eq.${user.id}`,
    badge_id: `in.(${badgeIds.join(",")})`,
  });
  const awardedResponse = await fetch(`${url}/rest/v1/user_badges?${awardedQuery.toString()}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store",
  });
  if (!awardedResponse.ok) {
    const detail = await awardedResponse.text().catch(() => "");
    console.error("[donations/status] Could not read awarded donor badge:", awardedResponse.status, detail.slice(0, 250));
    return NextResponse.json({ error: "Could not load your donor tier." }, { status: 503 });
  }
  const awardedRows = await awardedResponse.json().catch(() => []);
  const awardedIds = new Set(Array.isArray(awardedRows) ? awardedRows.map((row: { badge_id?: string }) => row.badge_id) : []);
  const badgeTier = [...DONOR_TIERS].reverse().find(tier =>
    badgeDefinitions.some((badge: { id: string; badge_key: string }) => badge.badge_key === tier.key && awardedIds.has(badge.id))
  ) || null;
  const donationTier = [...DONOR_TIERS].reverse().find(tier => totalDonatedPence >= tier.amountPence) || null;
  const tierIndex = Math.max(
    donationTier ? DONOR_TIERS.findIndex(tier => tier.key === donationTier.key) : -1,
    badgeTier ? DONOR_TIERS.findIndex(tier => tier.key === badgeTier.key) : -1,
  );
  const currentTier = tierIndex >= 0 ? DONOR_TIERS[tierIndex] : null;
  const nextTier = DONOR_TIERS.find(tier => tierIndex < 0 || tier.amountPence > (currentTier?.amountPence || 0)) || null;
  const previousThreshold = currentTier?.amountPence || 0;
  const progressPercent = nextTier
    ? Math.max(0, Math.min(100, Math.round(((totalDonatedPence - previousThreshold) / (nextTier.amountPence - previousThreshold)) * 100)))
    : 100;


  return NextResponse.json({
    authenticated: true,
    totalDonatedPence,
    currentTier,
    nextTier,
    progressPercent,
    amountToNextPence: nextTier ? Math.max(0, nextTier.amountPence - totalDonatedPence) : 0,
    tiers: DONOR_TIERS,
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
