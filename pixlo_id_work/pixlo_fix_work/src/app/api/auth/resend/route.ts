import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string };
    const email = body.email?.trim().toLowerCase() || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const { url } = supabaseConfig();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const redirectTo = `${appUrl.replace(/\/$/, "")}/auth/callback`;
    const response = await fetch(`${url}/auth/v1/resend`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ type: "signup", email, options: { emailRedirectTo: redirectTo } }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = String(data.msg || data.message || data.error_description || data.error || "");
      const lowered = message.toLowerCase();
      if (lowered.includes("email address not authorized")) {
        return NextResponse.json({ error: "Supabase's built-in mail server will not send to this address. Configure custom SMTP in Supabase." }, { status: 400 });
      }
      if (response.status === 429 || lowered.includes("rate limit")) {
        return NextResponse.json({ error: "Please wait before requesting another verification email." }, { status: 429 });
      }
      return NextResponse.json({ error: message || "Unable to resend the verification email." }, { status: response.status });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to resend the verification email." }, { status: 500 });
  }
}
