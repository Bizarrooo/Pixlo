import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password || "";
    if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

    const { url } = supabaseConfig();
    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = String(data.error_description || data.msg || "");
      if (message.toLowerCase().includes("email not confirmed")) {
        return NextResponse.json({ error: "Your email has not been verified yet. Check your inbox or resend the verification email." }, { status: 403 });
      }
      return NextResponse.json({ error: message || "Invalid email or password." }, { status: response.status });
    }

    const result = NextResponse.json({ ok: true });
    result.cookies.set("pixlo_access_token", data.access_token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: Math.max(60, Number(data.expires_in) || 3600), path: "/" });
    result.cookies.set("pixlo_refresh_token", data.refresh_token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return result;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to sign you in." }, { status: 500 });
  }
}
