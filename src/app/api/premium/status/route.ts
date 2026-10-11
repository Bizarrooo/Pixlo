import { NextResponse } from "next/server";
import { serverEnv } from "../../../../lib/server-env";
import { supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const value = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] || "";
  try { return decodeURIComponent(value); } catch { return value; }
}

export async function GET(request: Request) {
  const accessToken = cookieValue(request, "pixlo_access_token");
  if (!accessToken) return NextResponse.json({ authenticated: false, premium: false }, { status: 401 });

  const { url, key } = supabaseConfig();
  const authResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!authResponse.ok) return NextResponse.json({ authenticated: false, premium: false }, { status: 401 });
  const user = await authResponse.json().catch(() => null);
  if (typeof user?.id !== "string") return NextResponse.json({ authenticated: false, premium: false }, { status: 401 });

  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return NextResponse.json({ error: "Premium storage is not configured." }, { status: 503 });
  const entitlementResponse = await fetch(
    `${url}/rest/v1/pixlo_premium_entitlements?select=status,purchased_at,price_paid,currency&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" },
  );
  if (!entitlementResponse.ok) {
    const diagnostic = await entitlementResponse.text().catch(() => "Could not read Supabase response body");
    let parsed: { code?: string; message?: string; details?: string; hint?: string } = {};
    try { parsed = JSON.parse(diagnostic); } catch {}
    console.error("[premium/status] Supabase entitlement query failed", { status: entitlementResponse.status, body: diagnostic.slice(0, 1200) });
    return NextResponse.json({ error: "Could not check Premium status.", diagnostic: { status: entitlementResponse.status, code: parsed.code || null, message: parsed.message || diagnostic.slice(0, 300), details: parsed.details || null, hint: parsed.hint || null } }, { status: 503 });
  }
  const rows = await entitlementResponse.json().catch(() => []);
  const entitlement = Array.isArray(rows) ? rows[0] : null;
  const premium = entitlement?.status === "active";
  return NextResponse.json({ authenticated: true, premium, entitlement: premium ? {
    purchasedAt: entitlement.purchased_at,
    pricePaid: entitlement.price_paid,
    currency: entitlement.currency,
  } : null }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
