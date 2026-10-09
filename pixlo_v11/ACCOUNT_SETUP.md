# Pixlo account setup

## 1. Install

```powershell
npm install
npm run dev
```

## 2. Supabase database

Open **Supabase -> SQL Editor**, paste the complete contents of `supabase/schema.sql`, and run it.

This creates `public.profiles`, enforces case-insensitive username uniqueness, and rejects invalid usernames.

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

The signup API does a fast availability check, and the database unique index is the final protection against duplicates.

## 6. Account flow

`/signup` -> Supabase Auth -> verification email -> `/auth/callback` -> Pixlo session cookies -> `/dashboard`.

A resend button is available on `/verify-email`.

The session route also refreshes expired access tokens using the refresh token so users are not randomly kicked back to login after about an hour.

### Why the verification email might not arrive

Supabase's built-in SMTP is a testing service. It currently only sends to pre-authorized team addresses and is limited to 2 auth emails per hour. For real Pixlo signups, configure a custom SMTP provider under **Authentication -> Emails -> SMTP Settings**.
