# Pixlo Discord Badge Worker

A separate Node.js worker that reconciles Discord roles to Pixlo profile badges every 15 minutes. It is intentionally not deployed as a Vercel serverless function.

## Environment variables

Set these in the worker host (not in browser/client-side variables):

- `DISCORD_BOT_TOKEN`: bot token from the Discord Developer Portal.
- `DISCORD_GUILD_ID`: ID of the official Pixlo Discord server.
- `SUPABASE_URL`: the project URL, e.g. `https://YOUR_PROJECT.supabase.co`.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase secret/service-role key. Keep this private.

## Discord setup

1. Create a bot application in the Discord Developer Portal and add the bot to the Pixlo server.
2. Enable the **Server Members Intent** under Bot → Privileged Gateway Intents. The worker needs this to reconcile members and roles.
3. Give the bot **View Channel**, **Send Messages**, **Embed Links**, and **Read Message History** in the two announcement channels. Also grant **View Audit Log** if you want the embeds to identify the moderator who awarded or removed a role; without it, the actor is shown as **Unknown / System**. The bot does not need permission to manage roles.
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

## Current scope

The dashboard currently accepts a direct HTTPS icon URL. A dedicated image upload flow and a user-facing badge visibility toggle are still separate follow-up tasks.
