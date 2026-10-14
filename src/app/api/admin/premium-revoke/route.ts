import { NextResponse } from "next/server";
import { serverEnv } from "../../../../lib/server-env";
import { supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";
const OWNER_USER_ID = "3f29f647-4b99-4f53-adf0-eb678bef1c5f";

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const value = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] || "";
  try { return decodeURIComponent(value); } catch { return value; }
}

async function getUserId(request: Request) {
  const token = cookieValue(request, "pixlo_access_token");
  if (!token) return null;
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return typeof user?.id === "string" ? user.id : null;
}

export async function POST(request: Request) {
  const actorId = await getUserId(request);
  if (actorId !== OWNER_USER_ID) return NextResponse.json({ error: "Only the Pixlo owner can revoke Premium." }, { status: 403 });

  const body = await request.json().catch(() => null) as { username?: unknown } | null;
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
    return NextResponse.json({ error: "Enter a valid Pixlo username (3–24 characters)." }, { status: 400 });
  }

  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return NextResponse.json({ error: "Premium storage is not configured." }, { status: 503 });
  const { url } = supabaseConfig();
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const profileResponse = await fetch(`${url}/rest/v1/profiles?select=id,username,display_name&username=ilike.${encodeURIComponent(username)}&limit=1`, { headers, cache: "no-store" });
  const profiles = await profileResponse.json().catch(() => []);
  if (!profileResponse.ok || !Array.isArray(profiles) || !profiles[0]?.id) {
    return NextResponse.json({ error: "That Pixlo username could not be found." }, { status: 404 });
  }
  const recipient = profiles[0];
  // Revoke active entitlements from either Stripe mode. Sandbox purchases are not
  // production Premium, but the admin revoke control should still clean up stale test rows.
  const entitlementResponse = await fetch(`${url}/rest/v1/pixlo_premium_entitlements?select=user_id,status,livemode&user_id=eq.${encodeURIComponent(String(recipient.id))}&status=eq.active`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ status: "revoked", updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
  const changed = await entitlementResponse.json().catch(() => []);
  if (!entitlementResponse.ok) {
    console.error("[admin/premium-revoke] Could not update entitlement:", entitlementResponse.status);
    return NextResponse.json({ error: "Could not revoke the Premium entitlement." }, { status: 503 });
  }
  if (!Array.isArray(changed) || changed.length === 0) {
    return NextResponse.json({ error: `@${"${recipient.username}"} does not have any active Premium entitlement in live or test mode.` }, { status: 404 });
  }

  // Mark gift ledger entries as handled and revoked so the bot cannot announce an old, unannounced gift later.
  const giftResponse = await fetch(`${url}/rest/v1/pixlo_premium_gifts?recipient_user_id=eq.${encodeURIComponent(String(recipient.id))}&status=eq.completed`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ status: "revoked", announced_at: null }),
    cache: "no-store",
  });
  if (!giftResponse.ok) {
    console.error("[admin/premium-revoke] Gift ledger update failed:", giftResponse.status, (await giftResponse.text().catch(() => "")).slice(0, 200));
  }

  // Remove only the Premium-purchase badge source, preserving manually awarded badges.
  const badgeLookup = await fetch(`${url}/rest/v1/badges?select=id&badge_key=eq.premium&limit=1`, { headers, cache: "no-store" });
  const badgeRows = await badgeLookup.json().catch(() => []);
  const badgeId = Array.isArray(badgeRows) ? badgeRows[0]?.id : null;
  if (badgeLookup.ok && badgeId) {
    await fetch(`${url}/rest/v1/user_badges?user_id=eq.${encodeURIComponent(String(recipient.id))}&badge_id=eq.${encodeURIComponent(String(badgeId))}&source=eq.premium_purchase`, {
      method: "DELETE", headers: { ...headers, Prefer: "return=minimal" }, cache: "no-store",
    }).catch(() => null);
    const profileSettingsResponse = await fetch(`${url}/rest/v1/profiles?select=settings&id=eq.${encodeURIComponent(String(recipient.id))}&limit=1`, { headers, cache: "no-store" });
    const profileSettings = await profileSettingsResponse.json().catch(() => []);
    if (profileSettingsResponse.ok && Array.isArray(profileSettings) && profileSettings[0]?.settings && typeof profileSettings[0].settings === "object") {
      const settings = profileSettings[0].settings as Record<string, unknown>;
      const activeBadgeIds = Array.isArray(settings.activeBadgeIds) ? settings.activeBadgeIds.filter((id): id is string => typeof id === "string" && id !== String(badgeId)) : [];
      const activeBadgeOrder = Array.isArray(settings.activeBadgeOrder) ? settings.activeBadgeOrder.filter((id): id is string => typeof id === "string" && id !== String(badgeId)) : [];
      await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(String(recipient.id))}`, {
        method: "PATCH", headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ settings: { ...settings, activeBadgeIds, activeBadgeOrder } }), cache: "no-store",
      }).catch(() => null);
    }
  }

  return NextResponse.json({ success: true, recipient: { username: recipient.username, displayName: recipient.display_name } });
}
