-- Pixlo donor badges and cumulative one-time donation tracking.
-- Requires the existing Pixlo badges migration (badges + user_badges).

create table if not exists public.pixlo_donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  checkout_session_id text not null unique,
  payment_intent_id text,
  amount_pence integer not null check (amount_pence >= 100 and amount_pence <= 100000),
  currency text not null default 'gbp' check (currency = 'gbp'),
  livemode boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists pixlo_donations_user_livemode_idx
  on public.pixlo_donations (user_id, livemode, created_at desc);

alter table public.pixlo_donations enable row level security;
revoke all on public.pixlo_donations from anon, authenticated;
grant select, insert on public.pixlo_donations to service_role;

insert into public.badges (badge_key, name, description, icon_url, is_active)
values
  ('donor_supporter', 'Supporter', 'Lifetime Pixlo donations reached £5.', '/badges/donor-supporter.svg', true),
  ('donor_patron', 'Patron', 'Lifetime Pixlo donations reached £15.', '/badges/donor-patron.svg', true),
  ('donor_benefactor', 'Benefactor', 'Lifetime Pixlo donations reached £30.', '/badges/donor-benefactor.svg', true),
  ('donor_sponsor', 'Sponsor', 'Lifetime Pixlo donations reached £50.', '/badges/donor-sponsor.svg', true),
  ('donor_elite_sponsor', 'Elite Sponsor', 'Lifetime Pixlo donations reached £100.', '/badges/donor-elite-sponsor.svg', true),
  ('donor_mythic_patron', 'Mythic Patron', 'Lifetime Pixlo donations reached £250.', '/badges/donor-mythic-patron.svg', true),
  ('donor_eternal_benefactor', 'Eternal Benefactor', 'Lifetime Pixlo donations reached £500.', '/badges/donor-eternal-benefactor.svg', true)
on conflict (badge_key) do update
set name = excluded.name,
    description = excluded.description,
    icon_url = excluded.icon_url,
    is_active = true;

notify pgrst, 'reload schema';
