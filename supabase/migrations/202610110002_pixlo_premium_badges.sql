-- Premium purchase awards are separate from manual and Discord-role awards.
-- Run this migration in the Supabase SQL Editor before relying on Premium badge grants.

alter table public.user_badges
  drop constraint if exists user_badges_source_check;

alter table public.user_badges
  drop constraint if exists user_badges_source_role_check;

alter table public.user_badges
  add constraint user_badges_source_check
  check (source in ('manual', 'discord_role', 'premium_purchase'));

alter table public.user_badges
  add constraint user_badges_source_role_check
  check (
    (source in ('manual', 'premium_purchase') and source_role_id is null)
    or (source = 'discord_role' and source_role_id is not null)
  );

create unique index if not exists user_badges_premium_purchase_unique
  on public.user_badges (user_id, badge_id)
  where source = 'premium_purchase';

grant select, insert, update, delete on public.badges to service_role;
grant select, insert, update, delete on public.user_badges to service_role;
grant select, insert, update on public.pixlo_premium_entitlements to service_role;

notify pgrst, 'reload schema';
