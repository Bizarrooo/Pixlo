import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { tokenHash?: string; type?: string };
    const tokenHash = body.tokenHash?.trim();
    const type = (body.type?.trim() || "email") as "email";
    if (!tokenHash) return NextResponse.json({ error: "Missing verification token." }, { status: 400 });

    const { url } = supabaseConfig();
    const verifyResponse = await fetch(`${url}/auth/v1/verify`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ token_hash: tokenHash, type }),
      cache: "no-store",
    });
    const data = await verifyResponse.json().catch(() => ({})) as { access_token?: string; refresh_token?: string; expires_in?: number; msg?: string; message?: string; error_description?: string };

    if (!verifyResponse.ok || !data.access_token || !data.refresh_token) {
      return NextResponse.json({ error: data.msg || data.message || data.error_description || "That verification link is invalid or expired." }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set("pixlo_access_token", data.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: Math.max(60, data.expires_in || 3600),
      path: "/",
    });
    response.cookies.set("pixlo_refresh_token", data.refresh_token, {
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
