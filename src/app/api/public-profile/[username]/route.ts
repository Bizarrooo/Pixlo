import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../../lib/supabase-config";
import { serverEnv } from "../../../../lib/server-env";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username: rawUsername } = await context.params;
    const username = rawUsername.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) return NextResponse.json({ profile: null }, { status: 404 });

    const { url } = supabaseConfig();
    const headers = authHeaders();
    const query = new URLSearchParams({ select: "id,username,display_name,settings", username: `eq.${username}`, limit: "1" });
    const response = await fetch(`${url}/rest/v1/profiles?${query.toString()}`, { headers, cache: "no-store" });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json({ profile: null, error: /settings|column|schema cache/i.test(detail) ? "Cloud profile storage is not set up yet." : "Unable to load this profile." }, { status: 500 });
    }
    const rows = await response.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return NextResponse.json({ profile: null }, { status: 404 });

    // Premium entitlement and badge awards are independent. Fetch them in parallel so
    // the homepage iframe does not wait through a chain of separate Supabase round trips.
    const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
    const liveMode = Boolean(serverEnv("STRIPE_SECRET_KEY")?.startsWith("sk_live_"));

    const premiumPromise: Promise<boolean> = (async () => {
      if (String(row.id) === "3f29f647-4b99-4f53-adf0-eb678bef1c5f") return true;
      if (!serviceKey) return false;
      try {
        const entitlementResponse = await fetch(
          `${url}/rest/v1/pixlo_premium_entitlements?select=status&user_id=eq.${encodeURIComponent(String(row.id))}&livemode=eq.${liveMode}&limit=1`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" },
        );
        if (!entitlementResponse.ok) return false;
        const entitlements = await entitlementResponse.json().catch(() => []);
        return Array.isArray(entitlements) && entitlements.some((item: { status?: string }) => item.status === "active");
      } catch {
        return false;
      }
    })();

    const badgesPromise: Promise<Array<{ id: string; name: string; description: string; icon_url: string | null; badge_key: string }>> = (async () => {
      try {
        const awardsResponse = await fetch(
          `${url}/rest/v1/public_badge_awards?select=badge_id&user_id=eq.${encodeURIComponent(String(row.id))}`,
          { headers, cache: "no-store" },
        );
        if (!awardsResponse.ok) return [];
        const awards = await awardsResponse.json().catch(() => []);
        const badgeIds = Array.isArray(awards)
          ? [...new Set(awards.map((award: { badge_id?: string }) => award.badge_id).filter((id: unknown): id is string => typeof id === "string"))]
          : [];
        if (!badgeIds.length) return [];
        const badgeQuery = new URLSearchParams({
          select: "id,name,description,icon_url,badge_key",
          is_active: "eq.true",
          id: `in.(${badgeIds.join(",")})`,
          order: "created_at.asc",
        });
        const badgeResponse = await fetch(`${url}/rest/v1/badges?${badgeQuery.toString()}`, { headers, cache: "no-store" });
        if (!badgeResponse.ok) return [];
        const rows = await badgeResponse.json().catch(() => []);
        return Array.isArray(rows) ? rows : [];
      } catch {
        return [];
      }
    })();

    const [isPremium, badges] = await Promise.all([premiumPromise, badgesPromise]);

    return NextResponse.json({
      profile: {
        username: row.username,
        displayName: row.display_name || row.username,
        settings: row.settings && typeof row.settings === "object" ? row.settings : {},
        premium: isPremium,
        badges,
      },
    }, { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" } });
  } catch {
    return NextResponse.json({ profile: null, error: "Unable to load this profile." }, { status: 500 });
  }
}
