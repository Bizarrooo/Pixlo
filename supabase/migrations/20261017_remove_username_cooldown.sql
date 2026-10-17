-- Run once in Supabase SQL Editor to remove the previously-installed 24-hour username cooldown.
-- Username uniqueness and the allowed username format remain enforced by Pixlo.
drop trigger if exists profiles_username_cooldown on public.profiles;
drop function if exists public.enforce_pixlo_username_cooldown();
