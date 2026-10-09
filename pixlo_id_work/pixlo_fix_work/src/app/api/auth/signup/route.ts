import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

function friendlyAuthError(data: Record<string, unknown>, status: number) {
  const message = String(data.msg || data.message || data.error_description || data.error || "");
  const lowered = message.toLowerCase();
  const code = String(data.code || "");

  if (code === "23505" || lowered.includes("duplicate key") || lowered.includes("profiles_username") || lowered.includes("username")) {
    return "That username is already taken. Please choose another one.";
  }
  if (lowered.includes("email address not authorized")) {
    return "Supabase is blocking this email because its built-in mail server only sends to authorized team addresses. Configure custom SMTP in Supabase, then try again.";
  }
  if (status === 429 || lowered.includes("rate limit")) {
    return "Too many verification emails were requested. Wait a little while and try again.";
  }
  if (
    code === "email_exists" ||
    code === "user_already_exists" ||
    lowered.includes("already registered") ||
    lowered.includes("user already exists") ||
    lowered.includes("email address already exists")
  ) {
    return "An account is already using this email. Please log in instead.";
  }
  return message || "Unable to create your Pixlo account.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string; username?: string };
    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password || "";
    const username = body.username?.trim().toLowerCase() || "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Your password must be at least 8 characters." }, { status: 400 });
    }
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
      return NextResponse.json({ error: "Username must be 3–24 characters using lowercase letters, numbers, dots, underscores or hyphens." }, { status: 400 });
    }

    const { url, key } = supabaseConfig();

    // Fast availability check. The database schema also enforces uniqueness, so
    // simultaneous signup requests cannot create the same username.
    const usernameCheck = await fetch(
      `${url}/rest/v1/profiles?select=id&username=eq.${encodeURIComponent(username)}&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        cache: "no-store",
      },
    );

    if (usernameCheck.ok) {
      const rows = await usernameCheck.json().catch(() => []);
      if (Array.isArray(rows) && rows.length > 0) {
        return NextResponse.json({ error: "That username is already taken. Please choose another one." }, { status: 409 });
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const redirectTo = `${appUrl.replace(/\/$/, "")}/auth/callback`;
    const response = await fetch(`${url}/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email, password, data: { username, display_name: username } }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    // Supabase can intentionally return an obfuscated user for an email that
    // already exists when email confirmation is enabled. That response can
    // still have HTTP 200, so treat an empty identities array as an existing
    // account instead of sending the user back through signup again.
    const returnedUser = (data && typeof data === "object" && data.user && typeof data.user === "object")
      ? data.user as { identities?: unknown[] | null }
      : null;
    const returnedIdentities = Array.isArray(returnedUser?.identities)
      ? returnedUser.identities
      : Array.isArray((data as { identities?: unknown[] | null })?.identities)
        ? (data as { identities?: unknown[] | null }).identities
        : null;

    if (returnedUser && Array.isArray(returnedIdentities) && returnedIdentities.length === 0) {
      return NextResponse.json(
        { error: "An account is already using this email. Please log in instead." },
        { status: 409 },
      );
    }

    if (!response.ok) {
      return NextResponse.json({ error: friendlyAuthError(data, response.status) }, { status: response.status });
    }

    const result = NextResponse.json({
      ok: true,
      needsEmailVerification: !data.access_token,
      email,
      username,
    });

    if (data.access_token && data.refresh_token) {
      const secure = process.env.NODE_ENV === "production";
      result.cookies.set("pixlo_access_token", data.access_token, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        maxAge: Math.max(60, Number(data.expires_in) || 3600),
        path: "/",
      });
      result.cookies.set("pixlo_refresh_token", data.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }

    return result;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create your Pixlo account." }, { status: 500 });
  }
}
