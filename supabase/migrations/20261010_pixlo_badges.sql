-- Pixlo badge system
-- Run this migration in the Supabase SQL Editor before deploying badge features.

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  badge_key text not null unique,
  name text not null,
  description text not null default '',
  icon_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.discord_role_badges (
  discord_role_id text not null,
  badge_id uuid not null references public.badges(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (discord_role_id, badge_id)
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  source text not null check (source in ('manual', 'discord_role')),
  source_role_id text,
  awarded_by uuid references public.profiles(id) on delete set null,
  awarded_at timestamptz not null default now(),
  constraint user_badges_source_role_check check (
    (source = 'manual' and source_role_id is null)
    or (source = 'discord_role' and source_role_id is not null)
  )
);

create unique index if not exists user_badges_manual_unique
  on public.user_badges (user_id, badge_id)
  where source = 'manual';

create unique index if not exists user_badges_discord_role_unique
  on public.user_badges (user_id, badge_id, source_role_id)
  where source = 'discord_role';

create index if not exists user_badges_user_id_idx on public.user_badges (user_id);
create index if not exists user_badges_badge_id_idx on public.user_badges (badge_id);

alter table public.profiles
  add column if not exists badges_hidden boolean not null default false;

alter table public.badges enable row level security;
alter table public.discord_role_badges enable row level security;
alter table public.user_badges enable row level security;

-- Badge definitions are safe to read publicly; inactive badges stay hidden.
grant select on public.badges to anon, authenticated;
drop policy if exists "Anyone can read active badges" on public.badges;
create policy "Anyone can read active badges"
  on public.badges for select
  to anon, authenticated
  using (is_active = true);

-- Badge awards can be displayed on public profiles. Writes are reserved for
-- trusted server-side code using the Supabase service-role key.
grant select on public.user_badges to anon, authenticated;
drop policy if exists "Anyone can read badge awards" on public.user_badges;
create policy "Anyone can read badge awards"
  on public.user_badges for select
  to anon, authenticated
  using (true);

-- Role mappings are private to trusted server-side code.
revoke all on public.discord_role_badges from anon, authenticated;
grant all on public.discord_role_badges to service_role;
grant insert, update, delete on public.badges to service_role;
grant insert, update, delete on public.user_badges to service_role;

notify pgrst, 'reload schema';
