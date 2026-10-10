import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username: rawUsername } = await context.params;
    const username = rawUsername.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) return NextResponse.json({ profile: null }, { status: 404 });

    const { url } = supabaseConfig();
    const headers = authHeaders();
    const query = new URLSearchParams({ select: "id,username,display_name,settings", username: `eq.${username}`, limit: "1" });
    const response = await fetch(`${url}/rest/v1/profiles?${query.toString()}`, { headers, cache: "no-store" });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json({ profile: null, error: /settings|column|schema cache/i.test(detail) ? "Cloud profile storage is not set up yet." : "Unable to load this profile." }, { status: 500 });
    }
    const rows = await response.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return NextResponse.json({ profile: null }, { status: 404 });

    let badges: Array<{ id: string; name: string; description: string; icon_url: string | null }> = [];
    const awardsResponse = await fetch(`${url}/rest/v1/public_badge_awards?select=badge_id&user_id=eq.${encodeURIComponent(String(row.id))}`, { headers, cache: "no-store" });
    if (awardsResponse.ok) {
      const awards = await awardsResponse.json().catch(() => []);
      const badgeIds = Array.isArray(awards) ? [...new Set(awards.map((award: { badge_id?: string }) => award.badge_id).filter((id: unknown): id is string => typeof id === "string"))] : [];
      if (badgeIds.length) {
        const badgeQuery = new URLSearchParams({ select: "id,name,description,icon_url", is_active: "eq.true", id: `in.(${badgeIds.join(",")})`, order: "created_at.asc" });
        const badgeResponse = await fetch(`${url}/rest/v1/badges?${badgeQuery.toString()}`, { headers, cache: "no-store" });
        if (badgeResponse.ok) {
          const badgeRows = await badgeResponse.json().catch(() => []);
          if (Array.isArray(badgeRows)) badges = badgeRows;
        }
      }
    }

    return NextResponse.json({
      profile: {
        username: row.username,
        displayName: row.display_name || row.username,
        settings: row.settings && typeof row.settings === "object" ? row.settings : {},
        badges,
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ profile: null, error: "Unable to load this profile." }, { status: 500 });
  }
}
