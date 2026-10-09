import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../lib/supabase-config";

export const runtime = "nodejs";

type ProfileRow = { username?: string; display_name?: string; settings?: { views?: number | string } | null };

export async function GET(request: Request) {
  try {
    const username = new URL(request.url).searchParams.get("username")?.trim().toLowerCase() || "";
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) return NextResponse.json({ error: "Enter a valid profile username." }, { status: 400 });
    const { url } = supabaseConfig();
    const headers = { ...authHeaders(), "Content-Type": "application/json" };
    const rpc = await fetch(`${url}/rest/v1/rpc/get_pixlo_view_leaderboard`, {
      method: "POST",
      headers,
      body: JSON.stringify({ p_username: username }),
      cache: "no-store",
    });
    if (rpc.ok) {
      const data = await rpc.json();
      if (data && Array.isArray(data.leaderboard)) return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    // Fallback keeps the leaderboard usable even if the optional SQL RPC has not been installed yet.
    const profilesResponse = await fetch(`${url}/rest/v1/profiles?select=username,display_name,settings&limit=10000`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!profilesResponse.ok) return NextResponse.json({ error: "Could not load the views leaderboard. Check the Supabase connection and database schema." }, { status: 503 });
    const profiles = await profilesResponse.json() as ProfileRow[];
    const ranked = profiles.map(profile => ({
      username: String(profile.username || "").toLowerCase(),
      displayName: String(profile.display_name || profile.username || ""),
      views: Math.max(0, Number(profile.settings?.views || 0) || 0),
    })).filter(profile => profile.username).sort((a, b) => b.views - a.views || a.username.localeCompare(b.username)).map((profile, index) => ({ ...profile, rank: index + 1 }));
    const viewer = ranked.find(profile => profile.username === username) || null;
    return NextResponse.json({ leaderboard: ranked.slice(0, 100), viewer, totalProfiles: ranked.length }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Could not load the views leaderboard." }, { status: 500 });
  }
}
