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
  const configuredLiveMode = Boolean(serverEnv("STRIPE_SECRET_KEY")?.startsWith("sk_live_"));
  if (Boolean(session?.livemode) !== configuredLiveMode) return NextResponse.json({ received: true });
  const product = String(session?.metadata?.product || "");

  if (product === "pixlo_donation") {
    const checkoutSessionId = session?.id;
    const amountTotal = Number(session?.amount_total);
    const currency = String(session?.currency || "").toLowerCase();
    const rawDonorId = session?.metadata?.user_id || session?.client_reference_id;
    const donorId = typeof rawDonorId === "string" && /^[0-9a-f-]{36}$/i.test(rawDonorId) ? rawDonorId : null;
    if (typeof checkoutSessionId !== "string" || !checkoutSessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "Donation checkout session is missing or invalid." }, { status: 400 });
    }
    if (!Number.isInteger(amountTotal) || amountTotal < 100 || amountTotal > 100000 || currency !== "gbp") {
      return NextResponse.json({ error: "Donation amount or currency is invalid." }, { status: 400 });
    }

    const { url } = supabaseConfig();
    const donationResponse = await fetch(`${url}/rest/v1/pixlo_donations?on_conflict=checkout_session_id`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({
        user_id: donorId,
        checkout_session_id: checkoutSessionId,
        payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        amount_pence: amountTotal,
        currency,
        livemode: Boolean(session.livemode),
      }),
      cache: "no-store",
    });
    if (!donationResponse.ok) {
      const detail = await donationResponse.text().catch(() => "");
      console.error("Could not record Pixlo donation:", donationResponse.status, detail.slice(0, 300));
      return NextResponse.json({ error: "Could not record Pixlo donation." }, { status: 500 });
    }

    if (donorId) {
      const liveMode = Boolean(session.livemode);
      const historyResponse = await fetch(
        `${url}/rest/v1/pixlo_donations?select=amount_pence&user_id=eq.${encodeURIComponent(donorId)}&livemode=eq.${liveMode}`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" },
      );
      if (!historyResponse.ok) {
        const detail = await historyResponse.text().catch(() => "");
        console.error("Could not total Pixlo donations:", historyResponse.status, detail.slice(0, 300));
        return NextResponse.json({ error: "Could not calculate donor tier." }, { status: 500 });
      }
      const history = await historyResponse.json().catch(() => []);
      const totalPence = Array.isArray(history)
        ? history.reduce((total: number, row: { amount_pence?: unknown }) => total + (Number.isInteger(Number(row.amount_pence)) ? Number(row.amount_pence) : 0), 0)
        : 0;
      const tierThresholds = [
        { key: "donor_supporter", amountPence: 500 },
        { key: "donor_patron", amountPence: 1500 },
        { key: "donor_benefactor", amountPence: 3000 },
        { key: "donor_sponsor", amountPence: 5000 },
        { key: "donor_elite_sponsor", amountPence: 10000 },
        { key: "donor_mythic_patron", amountPence: 25000 },
        { key: "donor_eternal_benefactor", amountPence: 50000 },
      ] as const;
      const selectedTier = [...tierThresholds].reverse().find(tier => totalPence >= tier.amountPence) || null;
      const allTierKeys = tierThresholds.map(tier => tier.key);
      const badgeQuery = new URLSearchParams({
        select: "id,badge_key",
        is_active: "eq.true",
        badge_key: `in.(${allTierKeys.join(",")})`,
      });
      const badgesResponse = await fetch(`${url}/rest/v1/badges?${badgeQuery.toString()}`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store",
      });
      if (!badgesResponse.ok) {
        const detail = await badgesResponse.text().catch(() => "");
        console.error("Could not load Pixlo donor badge definitions:", badgesResponse.status, detail.slice(0, 300));
        return NextResponse.json({ error: "Could not load donor badge definitions." }, { status: 500 });
      }
      const badgeRows = await badgesResponse.json().catch(() => []);
      const badges = Array.isArray(badgeRows)
        ? badgeRows.filter((badge: { id?: unknown; badge_key?: unknown }) => typeof badge.id === "string" && typeof badge.badge_key === "string")
        : [];
      const badgesByKey = new Map(badges.map((badge: { id: string; badge_key: string }) => [badge.badge_key, badge]));
      if (badges.length !== allTierKeys.length) {
        console.error("Pixlo donor badge definitions are incomplete. Run the donor badge migration in Supabase.");
        return NextResponse.json({ error: "Donor badge setup is incomplete." }, { status: 500 });
      }

      const donorBadgeIds = badges.map((badge: { id: string }) => badge.id);
      const existingQuery = new URLSearchParams({
        select: "id,badge_id,source",
        user_id: `eq.${donorId}`,
        badge_id: `in.(${donorBadgeIds.join(",")})`,
      });
      const existingResponse = await fetch(`${url}/rest/v1/user_badges?${existingQuery.toString()}`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store",
      });
      if (!existingResponse.ok) {
        const detail = await existingResponse.text().catch(() => "");
        console.error("Could not check existing Pixlo donor badges:", existingResponse.status, detail.slice(0, 300));
        return NextResponse.json({ error: "Could not check donor badges." }, { status: 500 });
      }
      const existingRows = await existingResponse.json().catch(() => []);
      const desiredBadge = selectedTier ? badgesByKey.get(selectedTier.key) || null : null;
      let hasDesiredManualBadge = false;
      const existingAwards = Array.isArray(existingRows) ? existingRows : [];

      for (const award of existingAwards as Array<{ id: string; badge_id: string; source: string }>) {
        const keep = Boolean(desiredBadge && award.badge_id === desiredBadge.id && award.source === "manual" && !hasDesiredManualBadge);
        if (keep) {
          hasDesiredManualBadge = true;
          continue;
        }
        const deleteResponse = await fetch(
          `${url}/rest/v1/user_badges?id=eq.${encodeURIComponent(award.id)}`,
          { method: "DELETE", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: "return=minimal" }, cache: "no-store" },
        );
        if (!deleteResponse.ok) {
          const detail = await deleteResponse.text().catch(() => "");
          console.error("Could not replace prior Pixlo donor tier badge:", deleteResponse.status, detail.slice(0, 300));
          return NextResponse.json({ error: "Could not update donor tier badge." }, { status: 500 });
        }
      }

      if (desiredBadge && !hasDesiredManualBadge) {
        const awardResponse = await fetch(`${url}/rest/v1/user_badges`, {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify([{
            user_id: donorId,
            badge_id: desiredBadge.id,
            source: "manual",
          }]),
          cache: "no-store",
        });
        if (!awardResponse.ok) {
          const detail = await awardResponse.text().catch(() => "");
          console.error("Could not award Pixlo donor tier badge:", awardResponse.status, detail.slice(0, 300));
          return NextResponse.json({ error: "Could not award donor tier badge." }, { status: 500 });
        }
      }
    }
    return NextResponse.json({ received: true });
  }

  if (product !== "pixlo_premium_lifetime") return NextResponse.json({ received: true });

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
      livemode: Boolean(session.livemode),
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Could not save Pixlo Premium entitlement:", response.status, detail.slice(0, 300));
    return NextResponse.json({ error: "Could not record Premium purchase." }, { status: 500 });
  }

  const giftType = session?.metadata?.gift_type === "paid" ? "paid" : null;
  const giftedByUserId = session?.metadata?.gifted_by_user_id;
  if (giftType && typeof giftedByUserId === "string" && /^[0-9a-f-]{36}$/i.test(giftedByUserId) && giftedByUserId !== userId) {
    const giftResponse = await fetch(`${url}/rest/v1/pixlo_premium_gifts?on_conflict=stripe_session_id`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({
        giver_user_id: giftedByUserId,
        recipient_user_id: userId,
        gift_type: "paid",
        value_pence: amountTotal,
        currency,
        status: "completed",
        stripe_session_id: checkoutSessionId,
      }),
      cache: "no-store",
    });
    if (!giftResponse.ok) {
      const detail = await giftResponse.text().catch(() => "");
      console.error("Could not record Pixlo Premium gift:", giftResponse.status, detail.slice(0, 300));
      return NextResponse.json({ error: "Could not record Premium gift." }, { status: 500 });
    }
  }

  try {
    await ensurePremiumBadge(userId);
  } catch (error) {
    console.error("Could not award Pixlo Premium badge:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not award Premium badge." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
