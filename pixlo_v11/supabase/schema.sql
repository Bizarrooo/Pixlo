-- Pixlo account/profile foundation.
-- Run this in Supabase Dashboard -> SQL Editor.
-- This version makes usernames case-insensitive and enforces a 3-24 character slug.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Normalize existing usernames before applying the unique index.
update public.profiles
set username = lower(trim(username));

-- Keep usernames unique regardless of capitalization.
create unique index if not exists profiles_username_lower_unique
on public.profiles (lower(username));

-- Discord account linking fields. Safe to run repeatedly.
alter table public.profiles add column if not exists discord_id text;
alter table public.profiles add column if not exists discord_username text;
alter table public.profiles add column if not exists discord_display_name text;
alter table public.profiles add column if not exists discord_avatar text;
alter table public.profiles add column if not exists discord_avatar_decoration text;
alter table public.profiles add column if not exists use_discord_avatar boolean not null default false;
alter table public.profiles add column if not exists use_discord_decoration boolean not null default false;
create unique index if not exists profiles_discord_id_unique
on public.profiles (discord_id) where discord_id is not null;

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable" on public.profiles;
create policy "Public profiles are viewable"
on public.profiles for select
using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_username text;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));

  if requested_username = '' then
    requested_username := 'user-' || left(new.id::text, 8);
  end if;

  if requested_username !~ '^[a-z0-9._-]{3,24}$' then
    raise exception 'Invalid Pixlo username';
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, requested_username, requested_username)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Data API grants.
-- This project was created with "Automatically expose new tables" disabled,
-- so the profiles table also needs explicit grants for the REST API.
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
