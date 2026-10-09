Discord import-path fix

The Discord OAuth routes now use the correct relative import paths:
- src/app/api/auth/discord/route.ts -> ../../../serverDb and ../../../../lib/supabase-config
- src/app/api/auth/discord/callback/route.ts -> ../../../../serverDb and ../../../../../lib/supabase-config

This package intentionally does not include .env.local or .env.example. Keep the working .env.local in your existing Pixlo project.
