import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { serverEnv } from "../../../../lib/server-env";
import { supabaseConfig } from "../../../../lib/supabase-config";
import { ensurePremiumBadge } from "../../../../lib/premium-badge";

export const runtime = "nodejs";

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(",").map(part => part.trim().split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !/^\d+$/.test(timestamp) || !signatures.length) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest();
  return signatures.some(signature => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const received = Buffer.from(signature, "hex");
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

export async function POST(request: Request) {
  const webhookSecret = serverEnv("STRIPE_WEBHOOK_SECRET");
  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!webhookSecret || !serviceKey) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") || "";
  if (!verifyStripeSignature(payload, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  let event: any;
  try { event = JSON.parse(payload); } catch { return NextResponse.json({ error: "Invalid event payload." }, { status: 400 }); }
  const supported = event?.type === "checkout.session.completed" || event?.type === "checkout.session.async_payment_succeeded";
  if (!supported) return NextResponse.json({ received: true });

  const session = event?.data?.object;
  if (session?.mode !== "payment" || session?.payment_status !== "paid") return NextResponse.json({ received: true });
  if (session?.metadata?.product !== "pixlo_premium_lifetime") return NextResponse.json({ received: true });

  const userId = session?.metadata?.user_id || session?.client_reference_id;
  const checkoutSessionId = session?.id;
  if (typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId) || typeof checkoutSessionId !== "string" || !checkoutSessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Checkout metadata is missing or invalid." }, { status: 400 });
  }

  const amountTotal = Number(session.amount_total);
  const currency = String(session.currency || "").toLowerCase();
  if (!Number.isInteger(amountTotal) || amountTotal < 50 || currency !== "gbp") {
    return NextResponse.json({ error: "Payment amount or currency is invalid." }, { status: 400 });
  }

  const { url } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/pixlo_premium_entitlements?on_conflict=user_id`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      user_id: userId,
      checkout_session_id: checkoutSessionId,
      payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      status: "active",
      price_paid: amountTotal,
      currency,
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Could not save Pixlo Premium entitlement:", response.status, detail.slice(0, 300));
    return NextResponse.json({ error: "Could not record Premium purchase." }, { status: 500 });
  }

  try {
    await ensurePremiumBadge(userId);
  } catch (error) {
    console.error("Could not award Pixlo Premium badge:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not award Premium badge." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
