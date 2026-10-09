import { serverEnv } from "./server-env";

export function supabaseConfig() {
  const url = serverEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = serverEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.");
  }
  return { url: url.replace(/\/$/, ""), key };
}

export function authHeaders() {
  const { key } = supabaseConfig();
  return { apikey: key, "Content-Type": "application/json" };
}
