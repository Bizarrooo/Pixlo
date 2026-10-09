-- Run this once in Supabase SQL Editor if Discord linking reports that
-- discord_membership_verified is missing from the profiles schema cache.
alter table public.profiles
  add column if not exists discord_membership_verified boolean not null default false;

-- Ensure API roles can access the row (RLS policies still apply).
grant select on public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;

-- Tell PostgREST to refresh its schema cache.
notify pgrst, 'reload schema';
