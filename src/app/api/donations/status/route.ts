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

type PublicTier = {
  key: string;
  name: string;
  amountPence: number;
  icon: string | null;
  badgeId: string;
};

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const value = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] || "";
  try { return decodeURIComponent(value); } catch { return value; }
}

async function getConfiguredTiers(url: string, serviceKey: string): Promise<PublicTier[] | null> {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const [tierResponse, badgeResponse] = await Promise.all([
    fetch(`${url}/rest/v1/pixlo_donor_tiers?select=tier_key,badge_id,threshold_pence&order=threshold_pence.asc`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/badges?select=id,badge_key,name,icon_url&is_active=eq.true&badge_key=in.(${DONOR_TIER_KEYS.join(",")})`, { headers, cache: "no-store" }),
  ]);
  if (!tierResponse.ok || !badgeResponse.ok) return null;

  const tierRows = await tierResponse.json().catch(() => []);
  const badgeRows = await badgeResponse.json().catch(() => []);
  const badgeByKey = new Map(
    (Array.isArray(badgeRows) ? badgeRows : [])
      .filter((badge: { id?: unknown; badge_key?: unknown }) => typeof badge.id === "string" && typeof badge.badge_key === "string")
      .map((badge: { id: string; badge_key: string; name?: string; icon_url?: string | null }) => [badge.badge_key, badge]),
  );
  const tiers: PublicTier[] = (Array.isArray(tierRows) ? tierRows : [])
    .filter((tier: { tier_key?: unknown; badge_id?: unknown; threshold_pence?: unknown }) =>
      typeof tier.tier_key === "string" &&
      DONOR_TIER_KEYS.includes(tier.tier_key as typeof DONOR_TIER_KEYS[number]) &&
      typeof tier.badge_id === "string" &&
      Number.isInteger(Number(tier.threshold_pence)) &&
      badgeByKey.has(tier.tier_key))
    .map((tier: { tier_key: string; badge_id: string; threshold_pence: number }) => {
      const badge = badgeByKey.get(tier.tier_key)!;
      return {
        key: tier.tier_key,
        name: String(badge.name || tier.tier_key),
        amountPence: Number(tier.threshold_pence),
        icon: typeof badge.icon_url === "string" ? badge.icon_url : null,
        badgeId: tier.badge_id,
      };
    })
    .sort((a, b) => a.amountPence - b.amountPence);
  return tiers.length === DONOR_TIER_KEYS.length ? tiers : null;
}

export async function GET(request: Request) {
  const { url, key } = supabaseConfig();
  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return NextResponse.json({ error: "Donor tier storage is not configured." }, { status: 503 });

  // Keep the public pricing rail in sync with the owner-managed tier thresholds,
  // whether or not the visitor is signed in.
  const configuredTiers = await getConfiguredTiers(url, serviceKey);
  if (!configuredTiers) {
    return NextResponse.json({ error: "Donor tier database setup is incomplete." }, { status: 503 });
  }
  const publicTiers = configuredTiers.map(({ key: tierKey, name, amountPence, icon }) => ({
    key: tierKey, name, amountPence, icon,
  }));

  const accessToken = cookieValue(request, "pixlo_access_token");
  if (!accessToken) {
    return NextResponse.json({ authenticated: false, totalDonatedPence: 0, currentTier: null, tiers: publicTiers }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const authResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const user = authResponse.ok ? await authResponse.json().catch(() => null) : null;
  if (typeof user?.id !== "string") {
    return NextResponse.json({ authenticated: false, totalDonatedPence: 0, currentTier: null, tiers: publicTiers }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

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
  const donationRows = await donationsResponse.json().catch(() => []);
  const totalDonatedPence = Array.isArray(donationRows)
    ? donationRows.reduce((total: number, row: { amount_pence?: unknown }) => total + (Number.isInteger(Number(row.amount_pence)) ? Number(row.amount_pence) : 0), 0)
    : 0;

  const badgeIds = configuredTiers.map(tier => tier.badgeId);
  const awardedQuery = new URLSearchParams({
    select: "badge_id",
    user_id: `eq.${user.id}`,
    badge_id: `in.(${badgeIds.join(",")})`,
  });
  const awardedResponse = await fetch(`${url}/rest/v1/user_badges?${awardedQuery.toString()}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    cache: "no-store",
  });
  if (!awardedResponse.ok) {
    const detail = await awardedResponse.text().catch(() => "");
    console.error("[donations/status] Could not read awarded donor badge:", awardedResponse.status, detail.slice(0, 250));
    return NextResponse.json({ error: "Could not load your donor tier." }, { status: 503 });
  }
  const awardedRows = await awardedResponse.json().catch(() => []);
  const awardedIds = new Set(Array.isArray(awardedRows) ? awardedRows.map((row: { badge_id?: string }) => row.badge_id) : []);
  const badgeTierIndex = [...configuredTiers].reverse().findIndex(tier => awardedIds.has(tier.badgeId));
  const highestAwardedTier = badgeTierIndex < 0 ? null : [...configuredTiers].reverse()[badgeTierIndex];
  const donationTier = [...configuredTiers].reverse().find(tier => totalDonatedPence >= tier.amountPence) || null;
  const selectedKey = (highestAwardedTier && (!donationTier || highestAwardedTier.amountPence > donationTier.amountPence))
    ? highestAwardedTier.key
    : donationTier?.key || null;
  const currentTier = selectedKey ? configuredTiers.find(tier => tier.key === selectedKey) || null : null;
  const nextTier = configuredTiers.find(tier => tier.amountPence > (currentTier?.amountPence || 0)) || null;
  const previousThreshold = currentTier?.amountPence || 0;
  const progressPercent = nextTier
    ? Math.max(0, Math.min(100, Math.round(((totalDonatedPence - previousThreshold) / (nextTier.amountPence - previousThreshold)) * 100)))
    : 100;

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
