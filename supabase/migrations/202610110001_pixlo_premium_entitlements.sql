-- Pixlo Premium lifetime entitlements.
-- Run this migration in the Supabase SQL Editor before enabling Premium payments.
create table if not exists public.pixlo_premium_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  checkout_session_id text not null unique,
  payment_intent_id text,
  status text not null default 'active' check (status in ('active', 'revoked')),
  price_paid integer not null,
  currency text not null default 'gbp',
  purchased_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pixlo_premium_entitlements enable row level security;

-- Entitlements are only read/written by trusted server routes using the service role.
revoke all on table public.pixlo_premium_entitlements from anon, authenticated;
