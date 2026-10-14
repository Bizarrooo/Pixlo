-- Pixlo Premium gifting ledger. Safe to run repeatedly.
create table if not exists public.pixlo_premium_gifts (
  id uuid primary key default gen_random_uuid(),
  giver_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  gift_type text not null check (gift_type in ('free', 'paid')),
  value_pence integer not null default 399 check (value_pence >= 0),
  currency text not null default 'gbp',
  status text not null default 'completed' check (status in ('pending', 'completed')),
  stripe_session_id text unique,
  created_at timestamptz not null default now()
);

create index if not exists pixlo_premium_gifts_recipient_created_idx
  on public.pixlo_premium_gifts (recipient_user_id, created_at desc);
create index if not exists pixlo_premium_gifts_giver_created_idx
  on public.pixlo_premium_gifts (giver_user_id, created_at desc);

alter table public.pixlo_premium_gifts enable row level security;
revoke all on public.pixlo_premium_gifts from anon, authenticated;
grant all on public.pixlo_premium_gifts to service_role;
