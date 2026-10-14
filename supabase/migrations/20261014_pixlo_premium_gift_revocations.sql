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
