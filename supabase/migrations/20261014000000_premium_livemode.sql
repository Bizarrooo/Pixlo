-- Separate test/sandbox Premium entitlements from real paid Premium purchases.
alter table public.pixlo_premium_entitlements
  add column if not exists livemode boolean not null default false;

create index if not exists pixlo_premium_entitlements_livemode_status_idx
  on public.pixlo_premium_entitlements (livemode, status);
