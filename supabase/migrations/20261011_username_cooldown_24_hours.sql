-- Run this once in the Supabase SQL Editor to update the existing database trigger.
-- Website deployment does not automatically change an existing Supabase trigger.

create or replace function public.enforce_pixlo_username_cooldown()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if lower(trim(new.username)) is distinct from lower(trim(old.username)) then
    if now() < coalesce(old.username_changed_at, old.created_at, now()) + interval '24 hours' then
      raise exception 'username_change_cooldown: You can change your username again after the 24-hour cooldown.';
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
