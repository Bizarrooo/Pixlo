import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

function readCookie(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const match = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match?.[1];
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { userId?: string };
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!/^[0-9a-f-]{36}$/i.test(userId)) {
      return NextResponse.json({ error: "Choose a valid saved account." }, { status: 400 });
    }

    const refreshCookie = readCookie(request, `pixlo_saved_refresh_${userId}`);
    if (!refreshCookie) {
      return NextResponse.json({ error: "This account needs to be signed in once on this device before quick switching is available." }, { status: 401 });
    }

    const { url } = supabaseConfig();
    const refreshedResponse = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ refresh_token: decodeURIComponent(refreshCookie) }),
      cache: "no-store",
    });
    const refreshed = await refreshedResponse.json().catch(() => ({}));
    if (!refreshedResponse.ok || !refreshed.access_token || !refreshed.refresh_token || refreshed.user?.id !== userId) {
      const response = NextResponse.json({ error: "This saved session has expired. Please sign in to this account again." }, { status: 401 });
      response.cookies.delete(`pixlo_saved_refresh_${userId}`);
      return response;
    }

    const secure = process.env.NODE_ENV === "production";
    const response = NextResponse.json({ ok: true });
    response.cookies.set("pixlo_access_token", refreshed.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: Math.max(60, Number(refreshed.expires_in) || 3600),
      path: "/",
    });
    response.cookies.set("pixlo_refresh_token", refreshed.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    response.cookies.set(`pixlo_saved_refresh_${userId}`, refreshed.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to switch accounts right now. Please try again." }, { status: 500 });
  }
}
