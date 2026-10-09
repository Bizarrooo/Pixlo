import { NextResponse } from "next/server";
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("pixlo_access_token");
  response.cookies.delete("pixlo_refresh_token");
  response.cookies.delete("pixlo_user");
  response.cookies.delete("pixlo_discord_state");
  response.cookies.delete("pixlo_discord_user");
  response.cookies.delete("pixlo_discord_username");
  return response;
}
