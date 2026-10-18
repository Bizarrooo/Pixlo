-- Admin-managed donor tiers and Discord role links.
-- Run after 202610180001_pixlo_donor_badge_tiers.sql.

create table if not exists public.pixlo_donor_tiers (
  tier_key text primary key,
  badge_id uuid not null unique references public.badges(id) on delete restrict,
  threshold_pence integer not null unique check (threshold_pence >= 100 and threshold_pence <= 100000),
  discord_role_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pixlo_donor_tiers_role_id_format check (
    discord_role_id is null or discord_role_id ~ '^[0-9]{15,22}$'
  )
);

create unique index if not exists pixlo_donor_tiers_discord_role_unique
  on public.pixlo_donor_tiers(discord_role_id)
  where discord_role_id is not null;

alter table public.pixlo_donor_tiers enable row level security;
revoke all on public.pixlo_donor_tiers from anon, authenticated;
grant select, insert, update, delete on public.pixlo_donor_tiers to service_role;

insert into public.pixlo_donor_tiers (tier_key, badge_id, threshold_pence)
select tier.tier_key, badges.id, tier.threshold_pence
from (values
  ('donor_supporter', 500),
  ('donor_patron', 1500),
  ('donor_benefactor', 3000),
  ('donor_sponsor', 5000),
  ('donor_elite_sponsor', 10000),
  ('donor_mythic_patron', 25000),
  ('donor_eternal_benefactor', 50000)
) as tier(tier_key, threshold_pence)
join public.badges as badges on badges.badge_key = tier.tier_key
on conflict (tier_key) do update
set badge_id = excluded.badge_id;

notify pgrst, 'reload schema';
