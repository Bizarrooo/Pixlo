import { NextResponse } from "next/server";
import { serverEnv } from "../../../../lib/server-env";
import { supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const value = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] || "";
  try { return decodeURIComponent(value); } catch { return value; }
}

async function currentUserId(request: Request) {
  const token = cookieValue(request, "pixlo_access_token");
  if (!token) return null;
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return typeof user?.id === "string" ? user.id : null;
}

export async function GET(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to manage your badges." }, { status: 401 });
  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return NextResponse.json({ error: "Badge settings are not configured on the server." }, { status: 503 });
  const { url } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/profiles?select=badges_hidden&id=eq.${encodeURIComponent(userId)}&limit=1`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not load badge visibility." }, { status: 503 });
  const rows = await response.json().catch(() => []);
  return NextResponse.json({ hidden: Boolean(Array.isArray(rows) && rows[0]?.badges_hidden) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to manage your badges." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.hidden !== "boolean") return NextResponse.json({ error: "Choose whether your badges should be hidden." }, { status: 400 });
  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return NextResponse.json({ error: "Badge settings are not configured on the server." }, { status: 503 });
  const { url } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ badges_hidden: body.hidden }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not save badge visibility." }, { status: 503 });
  return NextResponse.json({ hidden: body.hidden });
}
