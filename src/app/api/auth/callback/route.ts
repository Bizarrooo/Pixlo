import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.replace(/\+/g, " "))}`, request.url));
  if (!code) return NextResponse.redirect(new URL("/login?error=missing_verification_code", request.url));

  try {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=verification_failed", request.url));
  }
}
