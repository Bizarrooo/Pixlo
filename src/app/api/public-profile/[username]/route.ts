import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username: rawUsername } = await context.params;
    const username = rawUsername.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
      return NextResponse.json({ profile: null }, { status: 404 });
    }

    const { url } = supabaseConfig();
    const query = new URLSearchParams({
      select: "username,display_name,settings",
      "username": `eq.${username}`,
      limit: "1",
    });
    const response = await fetch(`${url}/rest/v1/profiles?${query.toString()}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json({ profile: null, error: /settings|column|schema cache/i.test(detail) ? "Cloud profile storage is not set up yet." : "Unable to load this profile." }, { status: 500 });
    }
    const rows = await response.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return NextResponse.json({ profile: null }, { status: 404 });

    return NextResponse.json({
      profile: {
        username: row.username,
        displayName: row.display_name || row.username,
        settings: row.settings && typeof row.settings === "object" ? row.settings : {},
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ profile: null, error: "Unable to load this profile." }, { status: 500 });
  }
}
