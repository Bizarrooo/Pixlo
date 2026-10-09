import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { tokenHash?: string; type?: string };
    const tokenHash = body.tokenHash?.trim();
    const type = (body.type?.trim() || "email") as "email";
    if (!tokenHash) return NextResponse.json({ error: "Missing verification token." }, { status: 400 });

    const { url, key } = supabaseConfig();
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || "That verification link is invalid or expired." }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set("pixlo_access_token", data.session.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: Math.max(60, data.session.expires_in || 3600),
      path: "/",
    });
    response.cookies.set("pixlo_refresh_token", data.session.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to verify your email right now." }, { status: 500 });
  }
}
