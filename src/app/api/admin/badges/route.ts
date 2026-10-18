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
  const [badgesResponse, mappingsResponse, donorTiersResponse, viewTiersResponse, recruiterTiersResponse] = await Promise.all([
    fetch(`${url}/rest/v1/badges?select=*&order=created_at.desc`, { headers: adminHeaders(serviceKey), cache: "no-store" }),
    fetch(`${url}/rest/v1/discord_role_badges?select=discord_role_id,badge_id,created_at`, { headers: adminHeaders(serviceKey), cache: "no-store" }),
    fetch(`${url}/rest/v1/pixlo_donor_tiers?select=tier_key,badge_id,threshold_pence,discord_role_id,created_at,updated_at&order=threshold_pence.asc`, { headers: adminHeaders(serviceKey), cache: "no-store" }),
    fetch(`${url}/rest/v1/pixlo_view_tiers?select=tier_key,badge_id,threshold_views,discord_role_id,created_at,updated_at&order=threshold_views.asc`, { headers: adminHeaders(serviceKey), cache: "no-store" }),
    fetch(`${url}/rest/v1/pixlo_recruiter_tiers?select=tier_key,badge_id,threshold_invites,discord_role_id,created_at,updated_at&order=threshold_invites.asc`, { headers: adminHeaders(serviceKey), cache: "no-store" }),
  ]);
  if (!badgesResponse.ok || !mappingsResponse.ok) return NextResponse.json({ error: "Could not load badge settings. Check that the badge migration ran successfully." }, { status: 503 });
  const badges = await badgesResponse.json();
  const mappings = await mappingsResponse.json();
  const donorTierSetupRequired = !donorTiersResponse.ok;
  const viewTierSetupRequired = !viewTiersResponse.ok;
  const recruiterTierSetupRequired = !recruiterTiersResponse.ok;
  const [donorTierRows, viewTierRows, recruiterTierRows] = await Promise.all([
    donorTierSetupRequired ? Promise.resolve([]) : donorTiersResponse.json(),
    viewTierSetupRequired ? Promise.resolve([]) : viewTiersResponse.json(),
    recruiterTierSetupRequired ? Promise.resolve([]) : recruiterTiersResponse.json(),
  ]);
  const badgeById = new Map((Array.isArray(badges) ? badges : []).map((badge: Row) => [String(badge.id), badge]));
  const donorTiers = (Array.isArray(donorTierRows) ? donorTierRows : []).map((tier: Row) => {
    const badge = badgeById.get(String(tier.badge_id)) || {};
    return { tier_key: String(tier.tier_key || ""), badge_id: String(tier.badge_id || ""), name: String(badge.name || tier.tier_key || ""), description: String(badge.description || ""), icon_url: typeof badge.icon_url === "string" ? badge.icon_url : null, threshold_pence: Number(tier.threshold_pence || 0), discord_role_id: typeof tier.discord_role_id === "string" ? tier.discord_role_id : "" };
  });
  const viewTiers = (Array.isArray(viewTierRows) ? viewTierRows : []).map((tier: Row) => {
    const badge = badgeById.get(String(tier.badge_id)) || {};
    return { tier_key: String(tier.tier_key || ""), badge_id: String(tier.badge_id || ""), name: String(badge.name || tier.tier_key || ""), description: String(badge.description || ""), icon_url: typeof badge.icon_url === "string" ? badge.icon_url : null, threshold_views: Number(tier.threshold_views || 0), discord_role_id: typeof tier.discord_role_id === "string" ? tier.discord_role_id : "" };
  });
  const recruiterTiers = (Array.isArray(recruiterTierRows) ? recruiterTierRows : []).map((tier: Row) => {
    const badge = badgeById.get(String(tier.badge_id)) || {};
    return { tier_key: String(tier.tier_key || ""), badge_id: String(tier.badge_id || ""), name: String(badge.name || tier.tier_key || ""), description: String(badge.description || ""), icon_url: typeof badge.icon_url === "string" ? badge.icon_url : null, threshold_invites: Number(tier.threshold_invites || 0), discord_role_id: typeof tier.discord_role_id === "string" ? tier.discord_role_id : "" };
  });
  return NextResponse.json({ badges, mappings, donorTiers, donorTierSetupRequired, viewTiers, viewTierSetupRequired, recruiterTiers, recruiterTierSetupRequired }, { headers: { "Cache-Control": "no-store" } });
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

    if (action === "save_donor_tier") {
      const tierKey = String(body?.tier_key || "").trim();
      const validKeys = new Set([
        "donor_supporter", "donor_patron", "donor_benefactor", "donor_sponsor",
        "donor_elite_sponsor", "donor_mythic_patron", "donor_eternal_benefactor",
      ]);
      const thresholdPence = Number(body?.threshold_pence);
      const roleId = String(body?.discord_role_id || "").trim();
      if (!validKeys.has(tierKey)) return json({ error: "Choose a valid Pixlo donor tier." }, 400);
      if (!Number.isInteger(thresholdPence) || thresholdPence < 100 || thresholdPence > 100000) {
        return json({ error: "Set a tier threshold between £1.00 and £1,000.00." }, 400);
      }
      if (roleId && !/^\d{15,22}$/.test(roleId)) {
        return json({ error: "Enter a valid Discord role ID, or leave it blank to disable role syncing for this tier." }, 400);
      }
      const orderedKeys = [
        "donor_supporter", "donor_patron", "donor_benefactor", "donor_sponsor",
        "donor_elite_sponsor", "donor_mythic_patron", "donor_eternal_benefactor",
      ];
      const currentTierRowsResponse = await requestDb("pixlo_donor_tiers?select=tier_key,threshold_pence", "GET");
      const currentTierRows = await currentTierRowsResponse.json().catch(() => null);
      if (!currentTierRowsResponse.ok || !Array.isArray(currentTierRows)) {
        return json({ error: "Donor tier settings are not available. Run the donor-tier admin migration in Supabase first." }, 503);
      }
      const currentThresholds = new Map(currentTierRows.map((tier: Row) => [String(tier.tier_key), Number(tier.threshold_pence)]));
      const rank = orderedKeys.indexOf(tierKey);
      const previousThreshold = rank > 0 ? currentThresholds.get(orderedKeys[rank - 1]) : undefined;
      const nextThreshold = rank < orderedKeys.length - 1 ? currentThresholds.get(orderedKeys[rank + 1]) : undefined;
      if ((typeof previousThreshold === "number" && thresholdPence <= previousThreshold) ||
          (typeof nextThreshold === "number" && thresholdPence >= nextThreshold)) {
        return json({ error: "Keep tier thresholds in ascending order. Each tier must cost more than the tier below and less than the tier above." }, 400);
      }
      const response = await requestDb(
        `pixlo_donor_tiers?tier_key=eq.${encodeURIComponent(tierKey)}`,
        "PATCH",
        { threshold_pence: thresholdPence, discord_role_id: roleId || null, updated_at: new Date().toISOString() },
        "return=representation",
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const dbError = result && typeof result === "object" ? result as Record<string, unknown> : {};
        const code = typeof dbError.code === "string" ? dbError.code : "";
        if (code === "42P01" || code === "PGRST205") return json({ error: "Donor tier settings are not set up yet. Run supabase/migrations/202610180002_pixlo_donor_tier_admin.sql in Supabase after the donor badge migration." }, 503);
        if (code === "23505") return json({ error: "That threshold or Discord role ID is already assigned to another tier. Every tier needs a unique threshold and role." }, 400);
        return json({ error: "Could not save donor tier settings. Check the Supabase donor-tier migration and role ID." }, 400);
      }
      if (!Array.isArray(result) || result.length === 0) return json({ error: "Donor tier not found. Run the donor-tier migration in Supabase." }, 404);
      return json({ ok: true });
    }

    if (action === "save_view_tier" || action === "save_recruiter_tier") {
      const viewAction = action === "save_view_tier";
      const tierKey = String(body?.tier_key || "").trim();
      const validKeys = viewAction
        ? ["views_seen", "views_rising", "views_viral", "views_buzzing", "views_main_character", "views_famous"]
        : ["recruiter_scout", "recruiter_recruiter", "recruiter_senior_recruiter", "recruiter_lead_recruiter", "recruiter_elite_recruiter"];
      const thresholdField = viewAction ? "threshold_views" : "threshold_invites";
      const rawThreshold = Number(body?.[thresholdField]);
      const maxThreshold = viewAction ? 1000000000000 : 1000000;
      const roleId = String(body?.discord_role_id || "").trim();
      const iconUrl = typeof body?.icon_url === "string" ? body.icon_url.trim() : null;
      if (!validKeys.includes(tierKey)) return json({ error: "Choose a valid badge tier." }, 400);
      if (!Number.isSafeInteger(rawThreshold) || rawThreshold < 1 || rawThreshold > maxThreshold) {
        return json({ error: viewAction ? "Enter a view threshold from 1 to 1,000,000,000,000." : "Enter an invite threshold from 1 to 1,000,000." }, 400);
      }
      if (roleId && !/^\d{15,22}$/.test(roleId)) return json({ error: "Enter a valid Discord role ID or leave it blank to disable role syncing for this tier." }, 400);
      if (iconUrl && !(/^(https:\/\/|\/)/i.test(iconUrl) && !/^\/\//.test(iconUrl))) return json({ error: "Use an HTTPS image URL or a site-relative icon path." }, 400);
      const table = viewAction ? "pixlo_view_tiers" : "pixlo_recruiter_tiers";
      const thresholdColumn = thresholdField;
      const currentResponse = await requestDb(`${table}?select=tier_key,${thresholdColumn}&order=${thresholdColumn}.asc`, "GET");
      const currentRows = await currentResponse.json().catch(() => null);
      if (!currentResponse.ok || !Array.isArray(currentRows)) return json({ error: "Tier settings are not available. Run supabase/migrations/202610180004_pixlo_view_and_recruiter_tiers.sql in Supabase first." }, 503);
      const orderedRows = [...currentRows].sort((a: Row, b: Row) => Number(a[thresholdColumn]) - Number(b[thresholdColumn]));
      const index = orderedRows.findIndex((row: Row) => String(row.tier_key) === tierKey);
      if (index < 0) return json({ error: "Tier not found. Run the latest Views and Recruiter tier migration." }, 404);
      const previous = index > 0 ? Number(orderedRows[index - 1][thresholdColumn]) : null;
      const next = index < orderedRows.length - 1 ? Number(orderedRows[index + 1][thresholdColumn]) : null;
      if ((previous !== null && rawThreshold <= previous) || (next !== null && rawThreshold >= next)) {
        return json({ error: "Keep tier thresholds in strictly ascending order. This tier must stay between the tiers directly above and below it." }, 400);
      }
      const patch: Row = { [thresholdColumn]: rawThreshold, discord_role_id: roleId || null, updated_at: new Date().toISOString() };
      const updated = await requestDb(`${table}?tier_key=eq.${encodeURIComponent(tierKey)}`, "PATCH", patch, "return=representation");
      const rows = await updated.json().catch(() => null);
      if (!updated.ok) {
        const detail = await updated.text().catch(() => "");
        return json({ error: /23505/.test(JSON.stringify(rows) + detail) ? "That threshold or Discord role is already assigned to another tier." : "Could not save the tier. Check the database migration and role ID." }, 400);
      }
      if (!Array.isArray(rows) || rows.length === 0) return json({ error: "Tier was not found." }, 404);
      if (iconUrl !== null) {
        const badgeUpdate = await requestDb(`badges?id=eq.${encodeURIComponent(String(rows[0].badge_id))}`, "PATCH", { icon_url: iconUrl || null }, "return=minimal");
        if (!badgeUpdate.ok) return json({ error: "The tier threshold was saved, but its icon URL could not be saved." }, 400);
      }
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
      // Always resolve the Pixlo account by profiles.username, never a Discord username.
      const profileQuery = new URLSearchParams({ select: "id,username", username: `ilike.${username}`, limit: "2" });
      const profileResponse = await requestDb(`profiles?${profileQuery.toString()}`, "GET", undefined, "return=representation");
      const profileBody = await profileResponse.json().catch(() => null);
      if (!profileResponse.ok) {
        const detail = profileBody && typeof profileBody === "object" && "message" in profileBody ? String((profileBody as Record<string, unknown>).message) : "";
        return json({ error: `Could not look up Pixlo usernames in the profiles table (HTTP ${profileResponse.status}).${detail ? ` ${detail.slice(0, 180)}` : " Check the Supabase service-role key and profiles table."}` }, 503);
      }
      const profiles = Array.isArray(profileBody) ? profileBody : [];
      const matches = profiles.filter((row: Row) => String(row.username || "").toLowerCase() === username);
      if (matches.length > 1) return json({ error: `More than one Pixlo profile matches @${username}. Fix duplicate usernames before awarding badges.` }, 409);
      const profile = matches[0];
      if (!profile?.id) return json({ error: `Pixlo username @${username} was not found in the profiles table. This checks Pixlo usernames only, not Discord usernames. Make sure the account has a saved Pixlo profile.` }, 404);
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
