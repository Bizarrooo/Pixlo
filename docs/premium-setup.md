# Pixlo Premium beta payment setup

Pixlo Premium uses a **one-time Stripe Checkout payment** in GBP. The default beta price is £3.99 (399 pence). Premium is recorded as a lifetime entitlement for the Pixlo account that completed checkout; later price changes affect new purchases only.

## 1. Apply the database migration

In the Supabase project used by Pixlo, open **SQL Editor** and run the contents of:

`supabase/migrations/202610110001_pixlo_premium_entitlements.sql`

The entitlement table has Row Level Security enabled and direct access revoked. The website's server routes and Stripe webhook use the service-role key; never expose that key in a `NEXT_PUBLIC_*` variable.

## 2. Add Vercel environment variables

Add these to the Pixlo Vercel project for Production (and Preview only if you want to test there):

- `STRIPE_SECRET_KEY` — Stripe secret API key.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the webhook created in step 3.
- `SUPABASE_SERVICE_ROLE_KEY` — the Supabase service-role key, server-side only.
- `NEXT_PUBLIC_SITE_URL` — `https://pixlo1.vercel.app`.
- `PIXLO_PREMIUM_PRICE_GBP_PENCE` — optional; use `399` for £3.99. Future prices can be set in pence, for example `499` for £4.99. Existing entitlements are not repriced or removed.

Redeploy after changing Vercel environment variables.

## 3. Configure the Stripe webhook

In Stripe Dashboard, create a webhook endpoint:

`https://pixlo1.vercel.app/api/stripe/webhook`

Subscribe to these events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`. Keep Stripe in test mode while testing; test-mode and live-mode API keys/webhook secrets are different.

## 4. Test before launch

1. Confirm `/premium` loads.
2. Sign in to a test Pixlo account and start checkout.
3. Complete a Stripe test-mode payment.
4. In Stripe, confirm the webhook delivery returns HTTP 200.
5. Reopen `/premium` while signed into the same Pixlo account and confirm it reports lifetime Premium.
6. Confirm a second checkout for that account is blocked.

The checkout uses Stripe's hosted payment page. A return to the success URL alone does **not** grant Premium; only a verified Stripe webhook with a paid one-time Checkout Session can create the entitlement.

## Implementation note

This adds the purchase flow and lifetime entitlement record. Premium-specific product features and any Premium badge award should be connected to the entitlement after the intended Premium benefits are finalised.
