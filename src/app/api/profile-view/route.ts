import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../lib/supabase-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : "";

    if (!/^[a-z0-9._-]{3,24}$/.test(username) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId)) {
      return NextResponse.json({ error: "Invalid profile or visitor ID." }, { status: 400 });
    }

    const { url } = supabaseConfig();
    const response = await fetch(`${url}/rest/v1/rpc/register_pixlo_profile_view`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_username: username, p_visitor_id: visitorId }),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json({ error: /register_pixlo_profile_view|schema cache|function/i.test(detail) ? "Unique view tracking is not set up yet. Run the latest supabase/schema.sql." : "Unable to update profile views." }, { status: 503 });
    }

    const value = await response.json().catch(() => null);
    const views = typeof value === "number" ? value : Number(value?.register_pixlo_profile_view ?? value?.views);
    if (!Number.isFinite(views)) return NextResponse.json({ error: "Invalid view counter response." }, { status: 502 });

    return NextResponse.json({ views }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Unable to update profile views." }, { status: 500 });
  }
}
