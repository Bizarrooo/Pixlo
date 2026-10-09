import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../lib/supabase-config";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const username = new URL(request.url).searchParams.get("username")?.trim().toLowerCase() || "";
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) return NextResponse.json({ error: "Enter a valid profile username." }, { status: 400 });
    const { url } = supabaseConfig();
    const response = await fetch(`${url}/rest/v1/rpc/get_pixlo_view_leaderboard`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_username: username }),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json({ error: /get_pixlo_view_leaderboard|schema cache|function/i.test(detail) ? "The leaderboard database function is missing. Run the latest supabase/schema.sql in Supabase SQL Editor." : "Could not load the views leaderboard." }, { status: 503 });
    }
    const data = await response.json();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Could not load the views leaderboard." }, { status: 500 });
  }
}
