import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

function readCookie(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const match = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match?.[1];
}

function setAuthCookies(response: NextResponse, accessToken: string, refreshToken?: string, expiresIn = 3600) {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set("pixlo_access_token", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: Math.max(60, expiresIn),
    path: "/",
  });
  if (refreshToken) {
    response.cookies.set("pixlo_refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
}

async function getUser(accessToken: string) {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${decodeURIComponent(accessToken)}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json();
}

async function refreshSession(refreshToken: string) {
  const { url } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: decodeURIComponent(refreshToken) }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json();
}

export async function GET(request: Request) {
  const access = readCookie(request, "pixlo_access_token");
  const refresh = readCookie(request, "pixlo_refresh_token");

  try {
    if (access) {
      const user = await getUser(access);
      if (user) return NextResponse.json({ user });
    }

    if (refresh) {
      const refreshed = await refreshSession(refresh);
      if (refreshed?.access_token) {
        const user = await getUser(refreshed.access_token);
        if (user) {
          const response = NextResponse.json({ user });
          setAuthCookies(response, refreshed.access_token, refreshed.refresh_token, Number(refreshed.expires_in) || 3600);
          return response;
        }
      }
    }

    return NextResponse.json({ user: null });
  } catch {
    return NextResponse.json({ user: null });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
    const accessToken = body.access_token?.trim();
    if (!accessToken) return NextResponse.json({ error: "Missing access token." }, { status: 400 });

    const user = await getUser(accessToken);
    if (!user) return NextResponse.json({ error: "That verification session is no longer valid. Please log in normally." }, { status: 401 });

    const response = NextResponse.json({ ok: true, user });
    setAuthCookies(response, accessToken, body.refresh_token, body.expires_in);
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to finish your sign-in." }, { status: 500 });
  }
}
