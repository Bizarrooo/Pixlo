import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../lib/supabase-config";

export const runtime = "nodejs";

type ProfileSettings = { views?: number | string; avatar?: unknown } | null;
type ProfileRow = {
  username?: string;
  display_name?: string;
  settings?: ProfileSettings;
  discord_avatar?: string | null;
  discord_membership_verified?: boolean | null;
  use_discord_avatar?: boolean | null;
};
type LeaderboardPerson = { username: string; displayName: string; views: number; rank: number; avatar?: string | null };

function validPublicImage(value: unknown): string | null {
  return typeof value === "string" && /^https?:\/\//i.test(value) ? value : null;
}

async function addPublicAvatars<T extends { leaderboard: LeaderboardPerson[] }>(data: T, url: string, headers: Record<string, string>) {
  const people = Array.isArray(data.leaderboard) ? data.leaderboard.slice(0, 100) : [];
  if (!people.length) return { ...data, leaderboard: people };
  try {
    const usernames = people.map(person => person.username.toLowerCase()).filter(Boolean);
    if (!usernames.length) return { ...data, leaderboard: people };
    const query = new URLSearchParams({
      select: "username,settings,discord_avatar,discord_membership_verified,use_discord_avatar",
      username: "in.(" + usernames.join(",") + ")",
      limit: "100",
    });
    const response = await fetch(`${url}/rest/v1/profiles?${query.toString()}`, { headers, cache: "no-store" });
    if (!response.ok) return { ...data, leaderboard: people };
    const rows = await response.json() as ProfileRow[];
    const avatars = new Map<string, string>();
    for (const row of Array.isArray(rows) ? rows : []) {
      const key = String(row.username || "").toLowerCase();
      const discordAvatar = row.use_discord_avatar && row.discord_membership_verified ? validPublicImage(row.discord_avatar) : null;
      const profileAvatar = validPublicImage(row.settings?.avatar);
      const avatar = discordAvatar || profileAvatar;
      if (key && avatar) avatars.set(key, avatar);
    }
    return {
      ...data,
      leaderboard: people.map(person => ({ ...person, avatar: avatars.get(person.username.toLowerCase()) || null })),
    };
  } catch {
    return { ...data, leaderboard: people };
  }
}

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
      if (data && Array.isArray(data.leaderboard)) {
        const complete = await addPublicAvatars(data as { leaderboard: LeaderboardPerson[]; viewer: LeaderboardPerson | null; totalProfiles: number }, url, headers);
        return NextResponse.json(complete, { headers: { "Cache-Control": "no-store, max-age=0" } });
      }
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
      avatar: validPublicImage(profile.settings?.avatar),
    })).filter(profile => profile.username).sort((a, b) => b.views - a.views || a.username.localeCompare(b.username)).map((profile, index) => ({ ...profile, rank: index + 1 }));
    const viewer = ranked.find(profile => profile.username === username) || null;
    return NextResponse.json({ leaderboard: ranked.slice(0, 100), viewer, totalProfiles: ranked.length }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Could not load the views leaderboard." }, { status: 500 });
  }
}
