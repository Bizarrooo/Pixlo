import { NextResponse } from "next/server";
import { supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

const OWNER_USER_ID = "3f29f647-4b99-4f53-adf0-eb678bef1c5f";

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const value = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] || "";
  try { return decodeURIComponent(value); } catch { return value; }
}

export async function POST(request: Request) {
  try {
    const accessToken = cookieValue(request, "pixlo_access_token");
    if (!accessToken) return NextResponse.json({ error: "Sign in to use this control." }, { status: 401 });

    const { url, key } = supabaseConfig();
    const auth = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!auth.ok) return NextResponse.json({ error: "Your session expired. Sign in again." }, { status: 401 });
    const user = await auth.json().catch(() => null);
    if (user?.id !== OWNER_USER_ID) return NextResponse.json({ error: "This control is only available to the Pixlo owner account." }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const action = body?.action;
    const amount = Number(body?.amount);
    if (!["add", "remove"].includes(action) || !Number.isSafeInteger(amount) || amount < 1 || amount > 1000000) {
      return NextResponse.json({ error: "Choose Generate or Remove and enter a whole number from 1 to 1,000,000." }, { status: 400 });
    }

    const delta = action === "add" ? amount : -amount;
    const response = await fetch(`${url}/rest/v1/rpc/admin_adjust_pixlo_profile_views`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_delta: delta }),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const message = /admin_adjust_pixlo_profile_views|schema cache|function/i.test(detail)
        ? "The owner view control needs the latest database schema. Run supabase/schema.sql in Supabase SQL Editor, then try again."
        : "The view total could not be changed. Please try again.";
      return NextResponse.json({ error: message }, { status: 503 });
    }
    const result = await response.json().catch(() => null);
    const views = typeof result === "number" ? result : Number(result);
    if (!Number.isFinite(views)) return NextResponse.json({ error: "The database returned an invalid view total." }, { status: 502 });
    return NextResponse.json({ views }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Unable to adjust profile views." }, { status: 500 });
  }
}
