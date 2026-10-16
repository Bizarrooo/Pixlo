import { NextResponse } from "next/server";
import { supabaseConfig } from "../../../lib/supabase-config";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get("username")?.trim().toLowerCase() || "";
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
    return NextResponse.json({ available: false, valid: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const { url, key } = supabaseConfig();
    const response = await fetch(
      `${url}/rest/v1/profiles?select=id&username=eq.${encodeURIComponent(username)}&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return NextResponse.json({ available: false, error: "Unable to check username availability." }, {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const rows = await response.json().catch(() => null);
    if (!Array.isArray(rows)) {
      return NextResponse.json({ available: false, error: "Unable to check username availability." }, {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json(
      { available: rows.length === 0, valid: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ available: false, error: "Unable to check username availability." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
