import { NextResponse } from "next/server";
import { serverEnv } from "../../../../lib/server-env";
import { supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

const DONOR_TIER_KEYS = [
  "donor_supporter",
  "donor_patron",
  "donor_benefactor",
  "donor_sponsor",
  "donor_elite_sponsor",
  "donor_mythic_patron",
  "donor_eternal_benefactor",
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
  const [tierRowsRaw, badgeRowsRaw] = await Promise.all([
    fetch(
      `${url}/rest/v1/pixlo_donor_tiers?select=tier_key,badge_id,threshold_pence,discord_role_id&order=threshold_pence.asc`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" },
    ),
    fetch(
      `${url}/rest/v1/badges?select=id,badge_key,name,icon_url&is_active=eq.true&badge_key=in.(${DONOR_TIER_KEYS.join(",")})`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" },
    ),
  ]);
  if (!tierRowsRaw.ok || !badgeRowsRaw.ok) {
    return NextResponse.json({ error: "Donor tier database setup is incomplete." }, { status: 503 });
  }
  const tierRows = await tierRowsRaw.json().catch(() => []);
  const badgeRows = await badgeRowsRaw.json().catch(() => []);
  const badgeByKey = new Map(
    (Array.isArray(badgeRows) ? badgeRows : [])
      .filter((badge: { id?: unknown; badge_key?: unknown }) => typeof badge.id === "string" && typeof badge.badge_key === "string")
      .map((badge: { id: string; badge_key: string; name?: string; icon_url?: string | null }) => [badge.badge_key, badge]),
  );
  const tiers = (Array.isArray(tierRows) ? tierRows : [])
    .filter((tier: { tier_key?: unknown; badge_id?: unknown; threshold_pence?: unknown }) =>
      typeof tier.tier_key === "string" && DONOR_TIER_KEYS.includes(tier.tier_key as typeof DONOR_TIER_KEYS[number]) &&
      Number.isInteger(Number(tier.threshold_pence)) && badgeByKey.has(tier.tier_key))
    .map((tier: { tier_key: string; badge_id: string; threshold_pence: number; discord_role_id?: string | null }) => {
      const badge = badgeByKey.get(tier.tier_key)!;
      return {
        key: tier.tier_key,
        name: String(badge.name || tier.tier_key),
        amountPence: Number(tier.threshold_pence),
        icon: typeof badge.icon_url === "string" ? badge.icon_url : null,
        badgeId: tier.badge_id,
        discordRoleId: typeof tier.discord_role_id === "string" ? tier.discord_role_id : null,
      };
    })
    .sort((a: { amountPence: number }, b: { amountPence: number }) => a.amountPence - b.amountPence);
  if (tiers.length !== DONOR_TIER_KEYS.length) {
    return NextResponse.json({ error: "Donor tier database setup is incomplete." }, { status: 503 });
  }

  const badgeIds = tiers.map((tier: { badgeId: string }) => tier.badgeId);
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
  const badgeTier = [...tiers].reverse().find((tier: { badgeId: string }) => awardedIds.has(tier.badgeId)) || null;
  const donationTier = [...tiers].reverse().find((tier: { amountPence: number }) => totalDonatedPence >= tier.amountPence) || null;
  const tierIndex = Math.max(
    donationTier ? tiers.findIndex((tier: { key: string }) => tier.key === donationTier.key) : -1,
    badgeTier ? tiers.findIndex((tier: { key: string }) => tier.key === badgeTier.key) : -1,
  );
  const currentTier = tierIndex >= 0 ? tiers[tierIndex] : null;
  const nextTier = tiers.find((tier: { amountPence: number }) => tier.amountPence > (currentTier?.amountPence || 0)) || null;
  const previousThreshold = currentTier?.amountPence || 0;
  const progressPercent = nextTier
    ? Math.max(0, Math.min(100, Math.round(((totalDonatedPence - previousThreshold) / (nextTier.amountPence - previousThreshold)) * 100)))
    : 100;
  const publicTiers = tiers.map((tier: { key: string; name: string; amountPence: number; icon: string | null }) => ({
    key: tier.key,
    name: tier.name,
    amountPence: tier.amountPence,
    icon: tier.icon,
  }));

  return NextResponse.json({
    authenticated: true,
    totalDonatedPence,
    currentTier: currentTier ? { key: currentTier.key, name: currentTier.name, amountPence: currentTier.amountPence } : null,
    nextTier: nextTier ? { key: nextTier.key, name: nextTier.name, amountPence: nextTier.amountPence } : null,
    progressPercent,
    amountToNextPence: nextTier ? Math.max(0, nextTier.amountPence - totalDonatedPence) : 0,
    tiers: publicTiers,
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
