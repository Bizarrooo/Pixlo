import { NextResponse } from "next/server";
import { serverEnv } from "../../../lib/server-env";
import { supabaseConfig } from "../../../lib/supabase-config";

export const runtime = "nodejs";

const PIXLO_OWNER_ID = "3f29f647-4b99-4f53-adf0-eb678bef1c5f";

// The Pixlo owner account has Premium access for testing and administration.
const PIXLO_OWNER_ID = "3f29f647-4b99-4f53-adf0-eb678bef1c5f";

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const value = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] || "";
  try { return decodeURIComponent(value); } catch { return value; }
}

async function sessionUser(request: Request) {
  const token = cookieValue(request, "pixlo_access_token");
  if (!token) return null;
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return typeof user?.id === "string" ? user as { id: string } : null;
}

async function premiumAccess(userId: string, url: string, serviceKey: string) {
  if (userId === PIXLO_OWNER_ID) return true;
  const liveMode = Boolean(serverEnv("STRIPE_SECRET_KEY")?.startsWith("sk_live_"));
  const response = await fetch(
    `${url}/rest/v1/pixlo_premium_entitlements?select=status&user_id=eq.${encodeURIComponent(userId)}&livemode=eq.${liveMode}&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" },
  );
  if (!response.ok) throw new Error("Could not verify Premium access.");
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows.some((row: { status?: string }) => row.status === "active");
}

async function context(request: Request) {
  const user = await sessionUser(request);
  if (!user) return { response: NextResponse.json({ error: "Please sign in again." }, { status: 401 }) };
  const { url } = supabaseConfig();
  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return { response: NextResponse.json({ error: "Preset storage is not configured." }, { status: 503 }) };
  try {
    const premium = await premiumAccess(user.id, url, serviceKey);
    return { user, url, serviceKey, premium };
  } catch {
    return { response: NextResponse.json({ error: "Could not verify Premium access right now." }, { status: 503 }) };
  }
}

export async function GET(request: Request) {
  const ctx = await context(request);
  if ("response" in ctx) return ctx.response;
  if (!ctx.premium) return NextResponse.json({ premium: false, slots: [] }, { headers: { "Cache-Control": "no-store" } });
  const previewSlot = Number(new URL(request.url).searchParams.get("preview"));
  if (Number.isInteger(previewSlot) && previewSlot >= 1 && previewSlot <= 8) {
    const previewResponse = await fetch(
      `${ctx.url}/rest/v1/pixlo_profile_presets?select=slot_number,name,settings,updated_at&user_id=eq.${encodeURIComponent(ctx.user.id)}&slot_number=eq.${previewSlot}&limit=1`,
      { headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` }, cache: "no-store" },
    );
    if (!previewResponse.ok) return NextResponse.json({ error: "Could not load this preset preview." }, { status: 503 });
    const previewRows = await previewResponse.json().catch(() => []);
    return NextResponse.json({ premium: true, slot: Array.isArray(previewRows) ? previewRows[0] || null : null }, { headers: { "Cache-Control": "no-store" } });
  }
  const response = await fetch(
    `${ctx.url}/rest/v1/pixlo_profile_presets?select=slot_number,name,settings,updated_at&user_id=eq.${encodeURIComponent(ctx.user.id)}&order=slot_number.asc`,
    { headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` }, cache: "no-store" },
  );
  if (!response.ok) return NextResponse.json({ error: "Could not load presets. Apply the Pixlo presets database migration first." }, { status: 503 });
  const slots = await response.json().catch(() => []);
  return NextResponse.json({ premium: true, slots: Array.isArray(slots) ? slots : [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const ctx = await context(request);
  if ("response" in ctx) return ctx.response;
  if (!ctx.premium) return NextResponse.json({ error: "Pixlo Premium is required to save presets." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const slot = Number(body.slot);
  if (!Number.isInteger(slot) || slot < 1 || slot > 5) return NextResponse.json({ error: "Choose a preset slot from 1 to 8." }, { status: 400 });
  if (!body.settings || typeof body.settings !== "object" || Array.isArray(body.settings)) return NextResponse.json({ error: "Preset settings are missing." }, { status: 400 });
  const settings = body.settings as Record<string, unknown>;
  const serialized = JSON.stringify(settings);
  if (serialized.length > 900_000) return NextResponse.json({ error: "This preset is too large to save. Please reduce unusually large text fields." }, { status: 413 });
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
  const response = await fetch(
    `${ctx.url}/rest/v1/pixlo_profile_presets?on_conflict=user_id,slot_number`,
    {
      method: "POST",
      headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ user_id: ctx.user.id, slot_number: slot, name: name || `Preset ${slot}`, settings, updated_at: new Date().toISOString() }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[presets] save failed", response.status, detail.slice(0, 500));
    return NextResponse.json({ error: "Could not save this preset. Make sure the presets database migration has been applied." }, { status: 503 });
  }
  const rows = await response.json().catch(() => []);
  return NextResponse.json({ ok: true, slot: Array.isArray(rows) ? rows[0] : null });
}

export async function DELETE(request: Request) {
  const ctx = await context(request);
  if ("response" in ctx) return ctx.response;
  if (!ctx.premium) return NextResponse.json({ error: "Pixlo Premium is required to manage presets." }, { status: 403 });
  const slot = Number(new URL(request.url).searchParams.get("slot"));
  if (!Number.isInteger(slot) || slot < 1 || slot > 5) return NextResponse.json({ error: "Choose a preset slot from 1 to 5." }, { status: 400 });
  const response = await fetch(
    `${ctx.url}/rest/v1/pixlo_profile_presets?user_id=eq.${encodeURIComponent(ctx.user.id)}&slot_number=eq.${slot}`,
    { method: "DELETE", headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}`, Prefer: "return=minimal" }, cache: "no-store" },
  );
  if (!response.ok) return NextResponse.json({ error: "Could not clear this preset." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
