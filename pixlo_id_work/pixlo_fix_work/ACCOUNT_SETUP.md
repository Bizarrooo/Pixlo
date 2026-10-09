# Pixlo account setup

## 1. Install

```powershell
npm install
npm run dev
```

## 2. Supabase database

Open **Supabase -> SQL Editor**, paste the complete contents of `supabase/schema.sql`, and run it.

This creates/updates `public.profiles`, enforces case-insensitive username uniqueness, backfills mistaken sample display names, adds a database-enforced three-day username cooldown, and adds the Discord membership verification flag. Run this file again after updates that add schema fields.

## 3. Supabase Auth

In **Authentication -> Providers -> Email**:

- Enable Email provider.
- Keep **Confirm email** enabled if you want real email verification.

In **Authentication -> URL Configuration**:

- Site URL: `http://localhost:3000`
- Add Redirect URL: `http://localhost:3000/auth/callback`

When deploying, replace these with your real Pixlo domain.

## 4. Email delivery

Supabase's built-in SMTP is only for testing and is restricted to pre-authorized addresses and a low send limit. For normal Pixlo users, configure a custom SMTP provider in **Authentication -> Emails -> SMTP Settings**.

You do not need to put the SMTP password in this project. Supabase stores those SMTP settings for Auth.

## 5. Username rules

Pixlo usernames are normalized to lowercase and must be:

- 3 to 24 characters
- letters, numbers, `.`, `_`, `-`
- unique regardless of capitalization (`Bizarro` and `bizarro` cannot both exist)

The signup API does a fast availability check, and the database unique index is the final protection against duplicates. Username changes are blocked for three days after signup and for three days after any successful username change; the API and a database trigger both enforce the cooldown.

## 6. Account flow

`/signup` -> Supabase Auth -> verification email -> `/auth/callback` -> Pixlo session cookies -> `/dashboard`.

A resend button is available on `/verify-email`.

The session route also refreshes expired access tokens using the refresh token so users are not randomly kicked back to login after about an hour.

### Why the verification email might not arrive

Supabase's built-in SMTP is a testing service. It currently only sends to pre-authorized team addresses and is limited to 2 auth emails per hour. For real Pixlo signups, configure a custom SMTP provider under **Authentication -> Emails -> SMTP Settings**.

## 7. Discord server requirement and account switching

Discord linking requests the `identify` and `guilds` OAuth scopes and checks membership in the server behind invite `https://discord.gg/rdAyWGGDCe`. A failed membership check blocks linking and clears the stored Discord link for that Pixlo account. The browser keeps an HTTP-only, per-Pixlo-account OAuth token pair so membership can be rechecked while the user is signed in; when the link is no longer a member, the stored Discord profile is cleared.

Saved-account switching stores at most three email/username/display-name records in that browser and never stores passwords or auth tokens. Each Pixlo account's appearance settings use a separate local-storage key so one account won't load another account's dashboard settings on the same browser.
