import { NextResponse } from "next/server";
import { serverEnv } from "../../../../lib/server-env";
import { getSupabaseAuthUser } from "../../../../lib/pixlo-profile";

export const runtime = "nodejs";

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const match = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const clientId = serverEnv("DISCORD_CLIENT_ID");
  const baseUrl = (serverEnv("NEXT_PUBLIC_APP_URL") || requestUrl.origin).replace(/\/$/, "");
  const accessToken = cookieValue(request, "pixlo_access_token");

  if (!clientId) {
    return NextResponse.json({ error: "Discord OAuth is not configured. Add DISCORD_CLIENT_ID to .env.local." }, { status: 500 });
  }
  if (!accessToken) {
    return NextResponse.redirect(new URL("/login?next=/dashboard", baseUrl));
  }

  const authUser = await getSupabaseAuthUser(accessToken);
  if (!authUser) {
    return NextResponse.redirect(new URL("/login?next=/dashboard", baseUrl));
  }

  const callback = `${baseUrl}/api/auth/discord/callback`;
  const state = crypto.randomUUID();
  const pixloUsername = String(authUser.user_metadata?.username || "").trim().toLowerCase();
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", callback);
  url.searchParams.set("scope", "identify");
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  };
  response.cookies.set("pixlo_discord_state", state, cookieOptions);
  response.cookies.set("pixlo_discord_user", authUser.id, cookieOptions);
  response.cookies.set("pixlo_discord_username", pixloUsername, cookieOptions);
  return response;
}
