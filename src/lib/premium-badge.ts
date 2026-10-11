import { serverEnv } from "./server-env";
import { supabaseConfig } from "./supabase-config";

type BadgeRow = { id: string; badge_key?: string; name?: string };

export async function ensurePremiumBadge(userId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return false;
  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  const { url } = supabaseConfig();
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  const findBadge = async (): Promise<BadgeRow | null> => {
    const byKey = await fetch(`${url}/rest/v1/badges?select=id,badge_key,name&badge_key=eq.premium&limit=1`, {
      headers, cache: "no-store",
    });
    if (!byKey.ok) throw new Error(`Could not look up the Premium badge (${byKey.status}).`);
    const keyed = await byKey.json().catch(() => []);
    if (Array.isArray(keyed) && keyed[0]?.id) return keyed[0] as BadgeRow;

    const byName = await fetch(`${url}/rest/v1/badges?select=id,badge_key,name&name=ilike.%25premium%25&limit=1`, {
      headers, cache: "no-store",
    });
    if (!byName.ok) throw new Error(`Could not search for the Premium badge (${byName.status}).`);
    const named = await byName.json().catch(() => []);
    return Array.isArray(named) && named[0]?.id ? named[0] as BadgeRow : null;
  };

  let badge = await findBadge();
  if (!badge) {
    const createResponse = await fetch(`${url}/rest/v1/badges`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({
        badge_key: "premium",
        name: "Premium",
        description: "Pixlo Premium lifetime member",
        icon_url: null,
        is_active: true,
      }),
      cache: "no-store",
    });
    if (createResponse.ok) {
      const created = await createResponse.json().catch(() => []);
      badge = Array.isArray(created) && created[0]?.id ? created[0] as BadgeRow : null;
    } else if (createResponse.status === 409) {
      badge = await findBadge();
    } else {
      const detail = await createResponse.text().catch(() => "");
      throw new Error(`Could not create the Premium badge (${createResponse.status}): ${detail.slice(0, 200)}`);
    }
  }
  if (!badge?.id) throw new Error("The Premium badge could not be found or created.");

  const existingResponse = await fetch(
    `${url}/rest/v1/user_badges?select=id&user_id=eq.${encodeURIComponent(userId)}&badge_id=eq.${encodeURIComponent(badge.id)}&source=eq.premium_purchase&limit=1`,
    { headers, cache: "no-store" },
  );
  if (!existingResponse.ok) throw new Error(`Could not check the Premium badge award (${existingResponse.status}).`);
  const existing = await existingResponse.json().catch(() => []);
  if (Array.isArray(existing) && existing.length) return true;

  const awardResponse = await fetch(`${url}/rest/v1/user_badges`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userId, badge_id: badge.id, source: "premium_purchase", source_role_id: null }),
    cache: "no-store",
  });
  if (!awardResponse.ok) {
    // A simultaneous webhook/status request may have inserted the same award.
    if (awardResponse.status === 409) return true;
    const detail = await awardResponse.text().catch(() => "");
    throw new Error(`Could not award the Premium badge (${awardResponse.status}): ${detail.slice(0, 200)}`);
  }

  // Automatically equip the badge once, when the Premium award is first created.
  const profileResponse = await fetch(
    `${url}/rest/v1/profiles?select=settings&id=eq.${encodeURIComponent(userId)}&limit=1`,
    { headers, cache: "no-store" },
  );
  if (profileResponse.ok) {
    const rows = await profileResponse.json().catch(() => []);
    const settings = Array.isArray(rows) && rows[0]?.settings && typeof rows[0].settings === "object"
      ? rows[0].settings as Record<string, unknown>
      : {};
    const activeBadgeIds = Array.isArray(settings.activeBadgeIds) ? settings.activeBadgeIds.filter((id): id is string => typeof id === "string") : [];
    const activeBadgeOrder = Array.isArray(settings.activeBadgeOrder) ? settings.activeBadgeOrder.filter((id): id is string => typeof id === "string") : [];
    const nextSettings = {
      ...settings,
      activeBadgeIds: activeBadgeIds.includes(badge.id) ? activeBadgeIds : [...activeBadgeIds, badge.id],
      activeBadgeOrder: activeBadgeOrder.includes(badge.id) ? activeBadgeOrder : [...activeBadgeOrder, badge.id],
    };
    const updateResponse = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ settings: nextSettings }),
      cache: "no-store",
    });
    if (!updateResponse.ok) {
      console.error("[premium-badge] Award saved but automatic equip failed:", updateResponse.status, (await updateResponse.text().catch(() => "")).slice(0, 200));
    }
  } else {
    console.error("[premium-badge] Award saved but profile settings could not be loaded:", profileResponse.status);
  }
  return true;
}
