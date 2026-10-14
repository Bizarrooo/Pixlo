import { NextResponse } from "next/server";
import { serverEnv } from "../../../../lib/server-env";
import { supabaseConfig } from "../../../../lib/supabase-config";
import { ensurePremiumBadge } from "../../../../lib/premium-badge";

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
  if (actorId !== OWNER_USER_ID) return NextResponse.json({ error: "Only the Pixlo owner can gift free Premium." }, { status: 403 });

  const body = await request.json().catch(() => null) as { username?: unknown } | null;
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
    return NextResponse.json({ error: "Enter a valid Pixlo username (3–24 characters)." }, { status: 400 });
  }

  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return NextResponse.json({ error: "Premium storage is not configured." }, { status: 503 });
  const { url } = supabaseConfig();
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const profileResponse = await fetch(`${url}/rest/v1/profiles?select=id,username,display_name&username=ilike.${encodeURIComponent(username)}&limit=1`, {
    headers, cache: "no-store",
  });
  const profiles = await profileResponse.json().catch(() => []);
  if (!profileResponse.ok || !Array.isArray(profiles) || !profiles[0]?.id) {
    return NextResponse.json({ error: "That Pixlo username could not be found." }, { status: 404 });
  }
  const recipient = profiles[0];
  const liveMode = Boolean(serverEnv("STRIPE_SECRET_KEY")?.startsWith("sk_live_"));
  const existingResponse = await fetch(`${url}/rest/v1/pixlo_premium_entitlements?select=status&user_id=eq.${encodeURIComponent(String(recipient.id))}&livemode=eq.${liveMode}&limit=1`, {
    headers, cache: "no-store",
  });
  const existing = await existingResponse.json().catch(() => []);
  if (!existingResponse.ok) return NextResponse.json({ error: "Could not check the recipient's Premium status." }, { status: 503 });
  if (Array.isArray(existing) && existing.some((row: { status?: string }) => row.status === "active")) {
    return NextResponse.json({ error: `@${recipient.username} already owns lifetime Premium.` }, { status: 409 });
  }

  const giftId = crypto.randomUUID();
  const entitlementResponse = await fetch(`${url}/rest/v1/pixlo_premium_entitlements?on_conflict=user_id`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: recipient.id,
      checkout_session_id: `free_gift_${giftId}`,
      payment_intent_id: null,
      status: "active",
      price_paid: 0,
      currency: "gbp",
      livemode: liveMode,
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });
  if (!entitlementResponse.ok) {
    const detail = await entitlementResponse.text().catch(() => "");
    console.error("[admin/premium-gift] Could not save entitlement:", entitlementResponse.status, detail.slice(0, 300));
    return NextResponse.json({ error: "Could not grant Premium. No gift was recorded." }, { status: 500 });
  }

  const giftResponse = await fetch(`${url}/rest/v1/pixlo_premium_gifts`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({
      giver_user_id: actorId,
      recipient_user_id: recipient.id,
      gift_type: "free",
      value_pence: 399,
      currency: "gbp",
      status: "completed",
      stripe_session_id: null,
    }),
    cache: "no-store",
  });
  if (!giftResponse.ok) {
    const detail = await giftResponse.text().catch(() => "");
    console.error("[admin/premium-gift] Premium granted but gift ledger insert failed:", giftResponse.status, detail.slice(0, 300));
    return NextResponse.json({ error: "Premium was granted, but the gift announcement record could not be saved. Contact support before retrying." }, { status: 500 });
  }

  try { await ensurePremiumBadge(String(recipient.id)); }
  catch (error) {
    console.error("[admin/premium-gift] Premium granted but badge award failed:", error instanceof Error ? error.message : error);
  }

  return NextResponse.json({
    success: true,
    recipient: { username: recipient.username, displayName: recipient.display_name },
    value: "£3.99",
    type: "free",
  });
}
