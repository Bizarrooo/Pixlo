import { NextResponse } from "next/server";
import { serverEnv } from "../../../../lib/server-env";

export const runtime = "nodejs";

const ALLOWED_DONATION_AMOUNTS = new Set([100, 300, 500, 1000]);

export async function POST(request: Request) {
  const stripeKey = serverEnv("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return NextResponse.json({ error: "Donations are not configured yet. Please try again later." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as { amountPence?: unknown };
  const amountPence = Number(body.amountPence);
  if (!Number.isInteger(amountPence) || !ALLOWED_DONATION_AMOUNTS.has(amountPence)) {
    return NextResponse.json({ error: "Choose one of the available donation amounts." }, { status: 400 });
  }

  const configuredOrigin = serverEnv("NEXT_PUBLIC_SITE_URL") || "https://pixlo1.vercel.app";
  let origin: string;
  try {
    const parsed = new URL(configuredOrigin);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") throw new Error("Invalid site URL protocol");
    origin = parsed.origin;
  } catch {
    return NextResponse.json({ error: "The Pixlo site URL is not configured correctly." }, { status: 503 });
  }

  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", `${origin}/pricing?donation=success`);
  form.set("cancel_url", `${origin}/pricing?donation=cancelled`);
  form.set("metadata[product]", "pixlo_donation");
  form.set("metadata[donation_amount_pence]", String(amountPence));
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "gbp");
  form.set("line_items[0][price_data][unit_amount]", String(amountPence));
  form.set("line_items[0][price_data][product_data][name]", "Pixlo Donation");
  form.set("line_items[0][price_data][product_data][description]", "One-time voluntary donation to support Pixlo development.");

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
    cache: "no-store",
  });
  const session = await stripeResponse.json().catch(() => null);
  if (!stripeResponse.ok || typeof session?.url !== "string") {
    console.error("[donations/checkout] Stripe session creation failed:", session?.error?.type || stripeResponse.status);
    return NextResponse.json({ error: "Stripe could not start donation checkout. Please try again shortly." }, { status: 502 });
  }
  return NextResponse.json({ url: session.url });
}
