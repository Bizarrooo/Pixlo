import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../lib/supabase-config";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get("username")?.trim().toLowerCase();
  if (!username) return NextResponse.json({ profile: null }, { status: 400 });

  try {
    const { url } = supabaseConfig();
    const headers = authHeaders();
    const response = await fetch(
      `${url}/rest/v1/profiles?select=username,display_name,discord_avatar,discord_avatar_decoration,use_discord_avatar,use_discord_decoration&username=eq.${encodeURIComponent(username)}&limit=1`,
      { headers, cache: "no-store" },
    );
    if (response.ok) {
      const rows = await response.json().catch(() => []);
      return NextResponse.json({ profile: Array.isArray(rows) && rows[0] ? rows[0] : null });
    }

    const legacyResponse = await fetch(
      `${url}/rest/v1/profiles?select=username,display_name,discord_avatar&username=eq.${encodeURIComponent(username)}&limit=1`,
      { headers, cache: "no-store" },
    );
    if (!legacyResponse.ok) return NextResponse.json({ profile: null }, { status: 404 });
    const legacyRows = await legacyResponse.json().catch(() => []);
    const legacy = Array.isArray(legacyRows) && legacyRows[0] ? legacyRows[0] : null;
    return NextResponse.json({ profile: legacy ? { ...legacy, use_discord_avatar: false, use_discord_decoration: false, discord_avatar_decoration: null } : null });
  } catch {
    return NextResponse.json({ profile: null }, { status: 500 });
  }
}
