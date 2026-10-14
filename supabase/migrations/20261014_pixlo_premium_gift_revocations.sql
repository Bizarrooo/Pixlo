-- Allow the Premium gift ledger to retain revocations until the Discord bot announces them.
-- Safe to run repeatedly on an existing Pixlo database.
alter table public.pixlo_premium_gifts
  drop constraint if exists pixlo_premium_gifts_status_check;

alter table public.pixlo_premium_gifts
  add constraint pixlo_premium_gifts_status_check
  check (status in ('pending', 'completed', 'revoked'));

-- Keep unannounced revocations easy for the bot to find.
create index if not exists pixlo_premium_gifts_revocation_queue_idx
  on public.pixlo_premium_gifts (recipient_user_id, created_at asc)
  where status = 'revoked' and announced_at is null;

-- Durable queue for every Premium revocation, including accounts whose Discord role
-- was already missing when the bot next reconciles roles.
create table if not exists public.pixlo_premium_revocation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  discord_id text,
  revoked_at timestamptz not null default now(),
  announced_at timestamptz
);

create index if not exists pixlo_premium_revocation_events_pending_idx
  on public.pixlo_premium_revocation_events (revoked_at asc)
  where announced_at is null;

alter table public.pixlo_premium_revocation_events enable row level security;
revoke all on public.pixlo_premium_revocation_events from anon, authenticated;
grant all on public.pixlo_premium_revocation_events to service_role;
