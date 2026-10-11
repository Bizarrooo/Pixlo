-- Five account-owned Premium profile preset slots per Pixlo user.
create table if not exists public.pixlo_profile_presets (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot_number smallint not null check (slot_number between 1 and 5),
  name text not null default 'Preset',
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot_number)
);

alter table public.pixlo_profile_presets enable row level security;
revoke all on table public.pixlo_profile_presets from anon, authenticated;
grant select, insert, update, delete on table public.pixlo_profile_presets to service_role;
