import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

function readCookies(request: Request) {
  const raw = request.headers.get("cookie") || "";
  return raw.split(";").reduce<Record<string, string>>((cookies, part) => {
    const index = part.indexOf("=");
    if (index < 1) return cookies;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name && value) cookies[name] = value;
    return cookies;
  }, {});
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { userId?: string; email?: string };
    const userId = typeof body.userId === "string" && /^[0-9a-f-]{36}$/i.test(body.userId) ? body.userId : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!userId && !email) return NextResponse.json({ error: "Choose a valid saved account." }, { status: 400 });

    const cookies = readCookies(request);
    const candidates: { cookieName: string; token: string }[] = [];
    if (userId && cookies[`pixlo_saved_refresh_${userId}`]) {
      candidates.push({ cookieName: `pixlo_saved_refresh_${userId}`, token: cookies[`pixlo_saved_refresh_${userId}`] });
    }
    if (email) {
      for (const [cookieName, token] of Object.entries(cookies)) {
        if (!cookieName.startsWith("pixlo_saved_refresh_") || candidates.some(item => item.cookieName === cookieName)) continue;
        candidates.push({ cookieName, token });
      }
    }
    if (!candidates.length) {
      return NextResponse.json({ error: "There is no saved sign-in session for this account on this device. Sign in to it once, then quick switching will work." }, { status: 401 });
    }

    const { url } = supabaseConfig();
    let matched: any = null;
    let matchedUserId = "";
    let matchedCookieName = "";
    for (const candidate of candidates) {
      try {
        const refreshedResponse = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ refresh_token: decodeURIComponent(candidate.token) }),
          cache: "no-store",
        });
        const refreshed = await refreshedResponse.json().catch(() => ({}));
        const refreshedEmail = String(refreshed.user?.email || "").trim().toLowerCase();
        const correctId = !userId || refreshed.user?.id === userId;
        const correctEmail = !email || refreshedEmail === email;
        if (refreshedResponse.ok && refreshed.access_token && refreshed.refresh_token && correctId && correctEmail) {
          matched = refreshed;
          matchedUserId = String(refreshed.user?.id || "");
          matchedCookieName = candidate.cookieName;
          break;
        }
      } catch {}
    }

    if (!matched || !/^[0-9a-f-]{36}$/i.test(matchedUserId)) {
      return NextResponse.json({ error: "Pixlo could not find an active saved session for that account. Sign in to that account once to enable quick switching." }, { status: 401 });
    }

    const secure = process.env.NODE_ENV === "production";
    const response = NextResponse.json({ ok: true, user: { id: matchedUserId, email: matched.user?.email } });
    response.cookies.set("pixlo_access_token", matched.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: Math.max(60, Number(matched.expires_in) || 3600),
      path: "/",
    });
    response.cookies.set("pixlo_refresh_token", matched.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    response.cookies.set(`pixlo_saved_refresh_${matchedUserId}`, matched.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    if (matchedCookieName && matchedCookieName !== `pixlo_saved_refresh_${matchedUserId}`) {
      response.cookies.set(matchedCookieName, matched.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to switch accounts right now. Please try again." }, { status: 500 });
  }
}
