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

-- Public profile customizations. Safe to run repeatedly.
alter table public.profiles add column if not exists settings jsonb not null default '{}'::jsonb;

-- Discord account linking fields. Safe to run repeatedly.
alter table public.profiles add column if not exists discord_id text;
alter table public.profiles add column if not exists discord_username text;
alter table public.profiles add column if not exists discord_display_name text;
alter table public.profiles add column if not exists discord_avatar text;
alter table public.profiles add column if not exists discord_avatar_decoration text;
alter table public.profiles add column if not exists discord_membership_verified boolean not null default false;
alter table public.profiles add column if not exists use_discord_avatar boolean not null default false;
alter table public.profiles add column if not exists use_discord_decoration boolean not null default false;
alter table public.profiles add column if not exists username_changed_at timestamptz;

-- Backfill the username cooldown from each profile creation date.
update public.profiles set username_changed_at = coalesce(username_changed_at, created_at, now()) where username_changed_at is null;
alter table public.profiles alter column username_changed_at set default now();

-- Fix old profiles that inherited the sample default instead of their chosen username.
update public.profiles set display_name = username where display_name is null or trim(display_name) = '' or (lower(display_name) = 'mrbeat' and lower(username) <> 'mrbeat');
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
  requested_display_name text;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  requested_display_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  if requested_display_name = '' or lower(requested_display_name) = 'mrbeat' then
    requested_display_name := requested_username;
  end if;

  if requested_username = '' then
    requested_username := 'user-' || left(new.id::text, 8);
  end if;

  if requested_username !~ '^[a-z0-9._-]{3,24}$' then
    raise exception 'Invalid Pixlo username';
  end if;

  insert into public.profiles (id, username, display_name, username_changed_at)
  values (new.id, requested_username, requested_display_name, now())
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Enforce the three-day username cooldown in the database, not just in the UI/API.
create or replace function public.enforce_pixlo_username_cooldown()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if lower(trim(new.username)) is distinct from lower(trim(old.username)) then
    if now() < coalesce(old.username_changed_at, old.created_at, now()) + interval '3 days' then
      raise exception 'username_change_cooldown: You can change your username again after the three-day cooldown.';
    end if;
    new.username := lower(trim(new.username));
    new.username_changed_at := now();
  else
    new.username := lower(trim(new.username));
    new.username_changed_at := coalesce(old.username_changed_at, old.created_at, now());
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_username_cooldown on public.profiles;
create trigger profiles_username_cooldown
before update of username on public.profiles
for each row execute function public.enforce_pixlo_username_cooldown();

-- Data API grants.
-- This project was created with "Automatically expose new tables" disabled,
-- so the profiles table also needs explicit grants for the REST API.
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;


-- Public profile media storage. Uploaded files are stored outside the browser so shared profiles can load them.
insert into storage.buckets (id, name, public, file_size_limit)
values ('pixlo-assets', 'pixlo-assets', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "Pixlo users can upload their own profile assets" on storage.objects;
create policy "Pixlo users can upload their own profile assets"
on storage.objects for insert to authenticated
with check (bucket_id = 'pixlo-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Pixlo users can update their own profile assets" on storage.objects;
create policy "Pixlo users can update their own profile assets"
on storage.objects for update to authenticated
using (bucket_id = 'pixlo-assets' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'pixlo-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Pixlo users can delete their own profile assets" on storage.objects;
create policy "Pixlo users can delete their own profile assets"
on storage.objects for delete to authenticated
using (bucket_id = 'pixlo-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Pixlo profile assets are publicly viewable" on storage.objects;
create policy "Pixlo profile assets are publicly viewable"
on storage.objects for select to anon, authenticated
using (bucket_id = 'pixlo-assets');

-- Refresh PostgREST's schema cache so newly added Discord fields are immediately visible.

-- Unique profile views per persistent browser/device visitor ID.
create table if not exists public.profile_view_visitors (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  visitor_id uuid not null,
  first_seen_at timestamptz not null default now(),
  primary key (profile_id, visitor_id)
);
alter table public.profile_view_visitors enable row level security;

create or replace function public.register_pixlo_profile_view(p_username text, p_visitor_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $
declare
  target_profile_id uuid;
  inserted_profile_id uuid;
  current_views bigint;
begin
  select id into target_profile_id
  from public.profiles
  where lower(username) = lower(trim(p_username))
  limit 1;

  if target_profile_id is null then
    return null;
  end if;

  insert into public.profile_view_visitors (profile_id, visitor_id)
  values (target_profile_id, p_visitor_id)
  on conflict (profile_id, visitor_id) do nothing
  returning profile_id into inserted_profile_id;

  if inserted_profile_id is not null then
    update public.profiles
    set settings = jsonb_set(
      coalesce(settings, '{}'::jsonb),
      '{views}',
      to_jsonb(greatest(0, coalesce(nullif(settings->>'views', '')::bigint, 0)) + 1),
      true
    )
    where id = target_profile_id
    returning greatest(0, coalesce(nullif(settings->>'views', '')::bigint, 0)) into current_views;
  else
    select greatest(0, coalesce(nullif(settings->>'views', '')::bigint, 0))
    into current_views
    from public.profiles
    where id = target_profile_id;
  end if;

  return coalesce(current_views, 0);
end;
$;

revoke all on function public.register_pixlo_profile_view(text, uuid) from public;
grant execute on function public.register_pixlo_profile_view(text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
