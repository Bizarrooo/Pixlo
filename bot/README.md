# Pixlo Discord Badge Worker

A separate Node.js worker that reconciles Discord roles to Pixlo profile badges every five minutes. It is intentionally not deployed as a Vercel serverless function.

## Environment variables

Set these in the worker host (not in browser/client-side variables):

- `DISCORD_BOT_TOKEN`: bot token from the Discord Developer Portal.
- `DISCORD_GUILD_ID`: ID of the official Pixlo Discord server.
- `SUPABASE_URL`: the project URL, e.g. `https://YOUR_PROJECT.supabase.co`.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase secret/service-role key. Keep this private.
- Optional `PIXLO_DONATIONS_LIVEMODE`: set to `true` if the live Stripe environment is used; otherwise defaults to `PIXLO_PREMIUM_LIVEMODE` and then `false`.

## Discord setup

1. Create a bot application in the Discord Developer Portal and add the bot to the Pixlo server.
2. Enable the **Server Members Intent** under Bot → Privileged Gateway Intents. The worker needs this to reconcile members and roles.
3. Give the bot **View Channel**, **Send Messages**, **Embed Links**, and **Read Message History** in the two announcement channels. Also grant **View Audit Log** if you want the embeds to identify the moderator who awarded or removed a role; without it, the actor is shown as **Unknown / System**. If you enable donor tier role IDs below, grant **Manage Roles** and move the bot's highest role above all seven donor roles.
4. The worker posts orange embed announcements only when a role change corresponds to a role mapped to a Pixlo badge in `discord_role_badges`. Awards go to channel `1558891440891891712`; revocations go to channel `1558891471963168778`. Routine reconciliation, unrelated roles, and manual Pixlo badges do not generate announcements.
5. Keep the bot token and Supabase secret only in the worker host's environment variables.

## Run locally

From this folder:

```sh
npm install
npm start
```

## Deploy

Deploy this `bot` folder as a separate Node.js worker on a host that supports long-running processes. Use the four environment variables above. Do not run this as a Vercel function.

The worker uses `discord_role_badges` mappings created from the Pixlo owner badge dashboard. It removes Discord-derived awards when a linked Discord account no longer belongs to the configured guild, when its role is removed, when a role mapping is deleted, or when the Pixlo Discord link has been cleared. Manually awarded badges are never changed by this worker.

## Donor badge tiers

After both donor-tier migrations have been run in Supabase, configure each tier's threshold and Discord role ID in **Pixlo Dashboard → Admin → Manage Pixlo badges → Donor badge tiers**. Those values are stored in Supabase, so you do not need to edit Railway environment variables for each role. The worker reconciles linked Pixlo accounts' cumulative paid donations and configured Discord roles:


Leave a tier's role ID blank to disable Discord role sync for that tier while keeping website donor badges active. Each account has only one current donor badge: higher tiers replace lower ones. A donor role assigned directly in Discord syncs back to the linked website profile, while donations can upgrade the member to a higher tier. The worker checks frequently in the background. The bot needs **Manage Roles**, and every configured donor role must be below the bot's highest role in the server.

## Current scope

The dashboard currently accepts a direct HTTPS icon URL. A dedicated image upload flow and a user-facing badge visibility toggle are still separate follow-up tasks.

## Views and recruiter badge tiers

Run `supabase/migrations/202610180004_pixlo_view_and_recruiter_tiers.sql` in Supabase SQL Editor after the main badge migration. Configure view thresholds, each view icon URL, and optional Discord role IDs under **Pixlo Dashboard → Admin → Manage badges & tiers**. The same page configures Scout, Recruiter, Senior Recruiter, Lead Recruiter, and Elite Recruiter invite thresholds and roles.

For invite attribution, the bot needs the **Server Members** and **Guild Invites** gateway intents and **Manage Server** permission so it can read invite-use counts. Also grant **Manage Roles** and place its highest role above all configured tier roles. Restart/redeploy the worker after updating its code or permissions.

The bot records attributable invite joins from the point the updated worker is running. Each invited Discord account counts once. Vanity URL joins and joins where no invite-use change can be identified are not counted; previous invite history cannot be backfilled reliably.
