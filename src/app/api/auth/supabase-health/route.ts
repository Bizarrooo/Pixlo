import { NextResponse } from "next/server";
import { serverEnv } from "../../../../lib/server-env";
import { supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { url, key } = supabaseConfig();
    const keySource = serverEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
      ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      : serverEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        : "unknown";

    // /auth/v1/user and /auth/v1/settings require more than an API key in
    // some deployments. Test the public Data API instead, using the same
    // publishable key that the app uses. The Pixlo schema intentionally has
    // a public SELECT policy on profiles.
    const response = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    const body = await response.text();

    const fingerprint = key.length > 12 ? `${key.slice(0, 12)}…${key.slice(-6)}` : `length:${key.length}`;

    return NextResponse.json({
      configured: true,
      keySource,
      keyFingerprint: fingerprint,
      apiKeyValid: response.ok,
      status: response.status,
      error: response.ok ? undefined : body.slice(0, 240),
    });
  } catch (error) {
    return NextResponse.json({
      configured: false,
      apiKeyValid: false,
      error: error instanceof Error ? error.message : "Supabase could not be reached.",
    });
  }
}
