Discord linking in this version uses Supabase profiles as the single source of truth.
It does not use data/users.json for Discord linking.


DISCORD MEMBERSHIP COLUMN FIX
If the callback reports PGRST204 / missing discord_membership_verified, run supabase/migrations/20261009_discord_membership_verified.sql in Supabase SQL Editor. It adds the missing column and requests a PostgREST schema-cache reload. Do not replace .env.local.
