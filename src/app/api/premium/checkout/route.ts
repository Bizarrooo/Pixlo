import { NextResponse } from "next/server";
import { serverEnv } from "../../../../lib/server-env";
import { supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const value = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] || "";
  try { return decodeURIComponent(value); } catch { return value; }
}

export async function POST(request: Request) {
  const accessToken = cookieValue(request, "pixlo_access_token");
  if (!accessToken) return NextResponse.json({ error: "Sign in to buy Pixlo Premium." }, { status: 401 });

  const { url: supabaseUrl, key } = supabaseConfig();
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!authResponse.ok) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  const user = await authResponse.json().catch(() => null);
  if (typeof user?.id !== "string") return NextResponse.json({ error: "Could not verify your Pixlo account." }, { status: 401 });

  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey = serverEnv("STRIPE_SECRET_KEY");
  if (!serviceKey || !stripeKey) return NextResponse.json({ error: "Premium payments are not configured yet. Please try again later." }, { status: 503 });

  const existing = await fetch(
    `${supabaseUrl}/rest/v1/pixlo_premium_entitlements?select=status&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" },
  );
  if (!existing.ok) {
    const diagnostic = await existing.text().catch(() => "Could not read Supabase response body");
    console.error("[premium/checkout] Supabase entitlement query failed", { status: existing.status, body: diagnostic.slice(0, 1200) });
    return NextResponse.json({ error: "Premium storage is not ready. Check the server logs for the Supabase error." }, { status: 503 });
  }
  const entitlements = await existing.json().catch(() => []);
  if (Array.isArray(entitlements) && entitlements.some((entry: { status?: string }) => entry.status === "active")) {
    return NextResponse.json({ error: "This Pixlo account already owns lifetime Premium." }, { status: 409 });
  }

  const configuredPrice = Number(serverEnv("PIXLO_PREMIUM_PRICE_GBP_PENCE") || "399");
  const priceInPence = Number.isInteger(configuredPrice) && configuredPrice >= 50 && configuredPrice <= 1000000 ? configuredPrice : 399;
  const configuredOrigin = serverEnv("NEXT_PUBLIC_SITE_URL") || "https://pixlo1.vercel.app";
  const origin = configuredOrigin.endsWith("/") ? configuredOrigin.slice(0, -1) : configuredOrigin;
  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", `${origin}/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${origin}/premium?checkout=cancelled`);
  form.set("client_reference_id", user.id);
  form.set("metadata[user_id]", user.id);
  form.set("metadata[product]", "pixlo_premium_lifetime");
  form.set("payment_intent_data[metadata][user_id]", user.id);
  form.set("payment_intent_data[metadata][product]", "pixlo_premium_lifetime");
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "gbp");
  form.set("line_items[0][price_data][unit_amount]", String(priceInPence));
  form.set("line_items[0][price_data][product_data][name]", "Pixlo Premium — Lifetime");
  form.set("line_items[0][price_data][product_data][description]", "One-time beta purchase. Lifetime Premium access for this Pixlo account, including future price increases.");
  if (typeof user.email === "string" && user.email.includes("@")) form.set("customer_email", user.email);
  form.set("billing_address_collection", "auto");

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `pixlo-premium-${user.id}-${Date.now()}`,
    },
    body: form,
    cache: "no-store",
  });
  const session = await stripeResponse.json().catch(() => null);
  if (!stripeResponse.ok || typeof session?.url !== "string") {
    console.error("Stripe Premium Checkout session creation failed:", session?.error?.type || stripeResponse.status);
    return NextResponse.json({ error: "Stripe could not start checkout. Please try again shortly." }, { status: 502 });
  }
  return NextResponse.json({ url: session.url });
}
