-- Database-managed Views and Recruiter badge tiers for Pixlo.
-- Run in Supabase SQL Editor after the main badge migration.
begin;

insert into public.badges (badge_key, name, description, icon_url, is_active) values
  ('views_seen', 'Seen', 'Reach 100 profile views.', '/badges/views-seen.svg', true),
  ('views_rising', 'Rising', 'Reach 1,000 profile views.', '/badges/views-rising.svg', true),
  ('views_viral', 'Viral', 'Reach 10,000 profile views.', '/badges/views-viral.svg', true),
  ('views_buzzing', 'Buzzing', 'Reach 25,000 profile views.', '/badges/views-buzzing.svg', true),
  ('views_main_character', 'Main Character', 'Reach 50,000 profile views.', '/badges/views-main-character.svg', true),
  ('views_famous', 'Famous', 'Reach 100,000 profile views.', '/badges/views-famous.svg', true),
  ('recruiter_scout', 'Scout', 'Invite 5 unique people to the Pixlo Discord.', '/badges/recruiter-scout.svg', true),
  ('recruiter_recruiter', 'Recruiter', 'Invite 15 unique people to the Pixlo Discord.', '/badges/recruiter-recruiter.svg', true),
  ('recruiter_senior_recruiter', 'Senior Recruiter', 'Invite 30 unique people to the Pixlo Discord.', '/badges/recruiter-senior-recruiter.svg', true),
  ('recruiter_lead_recruiter', 'Lead Recruiter', 'Invite 50 unique people to the Pixlo Discord.', '/badges/recruiter-lead-recruiter.svg', true),
  ('recruiter_elite_recruiter', 'Elite Recruiter', 'Invite 100 unique people to the Pixlo Discord.', '/badges/recruiter-elite-recruiter.svg', true)
on conflict (badge_key) do update set
  name = excluded.name,
  description = excluded.description,
  icon_url = excluded.icon_url,
  is_active = true;

create table if not exists public.pixlo_view_tiers (
  tier_key text primary key,
  badge_id uuid not null unique references public.badges(id) on delete restrict,
  threshold_views bigint not null unique check (threshold_views >= 1 and threshold_views <= 1000000000000),
  discord_role_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pixlo_view_tiers_role_id_format check (discord_role_id is null or discord_role_id ~ '^[0-9]{15,22}$')
);
create unique index if not exists pixlo_view_tiers_discord_role_unique
  on public.pixlo_view_tiers(discord_role_id) where discord_role_id is not null;

insert into public.pixlo_view_tiers (tier_key, badge_id, threshold_views)
select tier.tier_key, b.id, tier.threshold_views
from (values
  ('views_seen', 100::bigint),
  ('views_rising', 1000::bigint),
  ('views_viral', 10000::bigint),
  ('views_buzzing', 25000::bigint),
  ('views_main_character', 50000::bigint),
  ('views_famous', 100000::bigint)
) as tier(tier_key, threshold_views)
join public.badges b on b.badge_key = tier.tier_key
on conflict (tier_key) do update set badge_id = excluded.badge_id;

create table if not exists public.pixlo_recruiter_tiers (
  tier_key text primary key,
  badge_id uuid not null unique references public.badges(id) on delete restrict,
  threshold_invites integer not null unique check (threshold_invites >= 1 and threshold_invites <= 1000000),
  discord_role_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pixlo_recruiter_tiers_role_id_format check (discord_role_id is null or discord_role_id ~ '^[0-9]{15,22}$')
);
create unique index if not exists pixlo_recruiter_tiers_discord_role_unique
  on public.pixlo_recruiter_tiers(discord_role_id) where discord_role_id is not null;

insert into public.pixlo_recruiter_tiers (tier_key, badge_id, threshold_invites)
select tier.tier_key, b.id, tier.threshold_invites
from (values
  ('recruiter_scout', 5),
  ('recruiter_recruiter', 15),
  ('recruiter_senior_recruiter', 30),
  ('recruiter_lead_recruiter', 50),
  ('recruiter_elite_recruiter', 100)
) as tier(tier_key, threshold_invites)
join public.badges b on b.badge_key = tier.tier_key
on conflict (tier_key) do update set badge_id = excluded.badge_id;

-- A Discord account can only be counted once as an attributed invitee.
create table if not exists public.pixlo_recruiter_invites (
  id uuid primary key default gen_random_uuid(),
  invited_discord_id text not null unique,
  inviter_discord_id text not null,
  invite_code text,
  joined_at timestamptz not null default now(),
  constraint pixlo_recruiter_invites_invited_id_format check (invited_discord_id ~ '^[0-9]{15,22}$'),
  constraint pixlo_recruiter_invites_inviter_id_format check (inviter_discord_id ~ '^[0-9]{15,22}$')
);
create index if not exists pixlo_recruiter_invites_inviter_idx
  on public.pixlo_recruiter_invites(inviter_discord_id);

alter table public.pixlo_view_tiers enable row level security;
alter table public.pixlo_recruiter_tiers enable row level security;
alter table public.pixlo_recruiter_invites enable row level security;
revoke all on public.pixlo_view_tiers from anon, authenticated;
revoke all on public.pixlo_recruiter_tiers from anon, authenticated;
revoke all on public.pixlo_recruiter_invites from anon, authenticated;
grant select, insert, update, delete on public.pixlo_view_tiers to service_role;
grant select, insert, update, delete on public.pixlo_recruiter_tiers to service_role;
grant select, insert, update, delete on public.pixlo_recruiter_invites to service_role;

notify pgrst, 'reload schema';
commit;
