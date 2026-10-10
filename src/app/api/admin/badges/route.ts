import { NextResponse } from "next/server";
import { serverEnv } from "../../../../lib/server-env";
import { supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

const OWNER_USER_ID = "3f29f647-4b99-4f53-adf0-eb678bef1c5f";
type Row = Record<string, unknown>;

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const value = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] || "";
  try { return decodeURIComponent(value); } catch { return value; }
}

async function getOwner(request: Request) {
  const accessToken = cookieValue(request, "pixlo_access_token");
  if (!accessToken) return false;
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) return false;
  const user = await response.json().catch(() => null);
  return user?.id === OWNER_USER_ID;
}

function adminHeaders(serviceKey: string, extra: Record<string, string> = {}) {
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", ...extra };
}

export async function GET(request: Request) {
  if (!await getOwner(request)) return NextResponse.json({ error: "Only the Pixlo owner can manage badges." }, { status: 403 });
  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is missing from the server environment." }, { status: 503 });
  const { url } = supabaseConfig();
  const [badgesResponse, mappingsResponse] = await Promise.all([
    fetch(`${url}/rest/v1/badges?select=*&order=created_at.desc`, { headers: adminHeaders(serviceKey), cache: "no-store" }),
    fetch(`${url}/rest/v1/discord_role_badges?select=discord_role_id,badge_id,created_at`, { headers: adminHeaders(serviceKey), cache: "no-store" }),
  ]);
  if (!badgesResponse.ok || !mappingsResponse.ok) return NextResponse.json({ error: "Could not load badge settings. Check that the badge migration ran successfully." }, { status: 503 });
  return NextResponse.json({ badges: await badgesResponse.json(), mappings: await mappingsResponse.json() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await getOwner(request)) return NextResponse.json({ error: "Only the Pixlo owner can manage badges." }, { status: 403 });
  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is missing from the server environment." }, { status: 503 });
  const { url } = supabaseConfig();
  const body = await request.json().catch(() => null) as Row | null;
  const action = body?.action;
  const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
  const requestDb = async (path: string, method: string, data?: unknown, prefer = "return=representation") => fetch(`${url}/rest/v1/${path}`, { method, headers: adminHeaders(serviceKey, { Prefer: prefer }), ...(data === undefined ? {} : { body: JSON.stringify(data) }), cache: "no-store" });

  try {
    if (action === "create_badge" || action === "update_badge") {
      const badgeKey = String(body?.badge_key || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 48);
      const name = String(body?.name || "").trim().slice(0, 48);
      const description = String(body?.description || "").trim().slice(0, 240);
      const iconUrl = typeof body?.icon_url === "string" ? body.icon_url.trim().slice(0, 1000) : null;
      if (!name || (action === "create_badge" && !badgeKey)) return json({ error: "A badge name and valid key are required." }, 400);
      const payload = { ...(action === "create_badge" ? { badge_key: badgeKey } : {}), name, description, icon_url: iconUrl, is_active: body?.is_active !== false };
      const path = action === "create_badge" ? "badges" : `badges?id=eq.${encodeURIComponent(String(body?.id || ""))}`;
      if (action === "update_badge" && !body?.id) return json({ error: "Badge ID is required." }, 400);
      const response = await requestDb(path, action === "create_badge" ? "POST" : "PATCH", payload);
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const dbError = result && typeof result === "object" ? result as Record<string, unknown> : {};
        const code = typeof dbError.code === "string" ? dbError.code : "";
        if (code === "23505") return json({ error: "That badge key already exists. Choose a different key." }, 400);
        if (code === "42P01" || code === "PGRST205") return json({ error: "The Pixlo badge tables are missing. Run supabase/migrations/20261010_pixlo_badges.sql in the Supabase SQL Editor, then try again." }, 503);
        if (code === "42501") return json({ error: "Supabase denied access to the badge tables. Check the service-role key and database grants." }, 503);
        const detail = typeof dbError.message === "string" ? dbError.message : "";
        return json({ error: detail ? `Could not save badge: ${detail}` : "Could not save badge. Check the Supabase badge migration and server environment." }, 400);
      }
      return json({ badge: Array.isArray(result) ? result[0] : result });
    }

    if (action === "delete_badge") {
      const id = String(body?.id || "");
      if (!id) return json({ error: "Badge ID is required." }, 400);
      const response = await requestDb(`badges?id=eq.${encodeURIComponent(id)}`, "DELETE", undefined, "return=minimal");
      if (!response.ok) return json({ error: "Could not delete this badge." }, 400);
      return json({ ok: true });
    }

    if (action === "map_role" || action === "unmap_role") {
      const roleId = String(body?.discord_role_id || "").trim();
      const badgeId = String(body?.badge_id || "").trim();
      if (!/^\d{15,22}$/.test(roleId) || !badgeId) return json({ error: "Enter a valid Discord role ID and choose a badge." }, 400);
      const path = `discord_role_badges?discord_role_id=eq.${encodeURIComponent(roleId)}&badge_id=eq.${encodeURIComponent(badgeId)}`;
      const response = action === "map_role"
        ? await requestDb("discord_role_badges", "POST", { discord_role_id: roleId, badge_id: badgeId }, "resolution=ignore-duplicates,return=representation")
        : await requestDb(path, "DELETE", undefined, "return=minimal");
      if (!response.ok) return json({ error: "Could not update the Discord role mapping." }, 400);
      return json({ ok: true });
    }

    if (action === "award_badge" || action === "revoke_badge") {
      const username = String(body?.username || "").trim().toLowerCase();
      const badgeId = String(body?.badge_id || "").trim();
      if (!/^[a-z0-9._-]{3,24}$/.test(username) || !badgeId) return json({ error: "Enter a valid Pixlo username and badge." }, 400);
      const profileResponse = await requestDb(`profiles?select=id,username&username=eq.${encodeURIComponent(username)}&limit=1`, "GET", undefined, "return=representation");
      const profiles = await profileResponse.json().catch(() => []);
      const profile = Array.isArray(profiles) ? profiles[0] : null;
      if (!profile?.id) return json({ error: `Pixlo user @${username} was not found.` }, 404);
      if (action === "award_badge") {
        const existingResponse = await requestDb(`user_badges?select=id&user_id=eq.${encodeURIComponent(String(profile.id))}&badge_id=eq.${encodeURIComponent(badgeId)}&source=eq.manual&limit=1`, "GET", undefined, "return=representation");
        if (!existingResponse.ok) return json({ error: "Could not check existing badge awards." }, 400);
        const existingAwards = await existingResponse.json().catch(() => []);
        if (!Array.isArray(existingAwards) || existingAwards.length === 0) {
          const response = await requestDb("user_badges", "POST", { user_id: profile.id, badge_id: badgeId, source: "manual" }, "return=representation");
          if (!response.ok) return json({ error: "Could not award badge. Check that the badge exists." }, 400);
        }
      } else {
        const response = await requestDb(`user_badges?user_id=eq.${encodeURIComponent(String(profile.id))}&badge_id=eq.${encodeURIComponent(badgeId)}&source=eq.manual`, "DELETE", undefined, "return=minimal");
        if (!response.ok) return json({ error: "Could not revoke badge." }, 400);
      }
      return json({ ok: true, username });
    }

    return json({ error: "Unknown badge management action." }, 400);
  } catch {
    return json({ error: "The badge operation failed unexpectedly." }, 500);
  }
}
