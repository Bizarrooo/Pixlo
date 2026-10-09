import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (error) return NextResponse.redirect(new URL(`/reset-password?error=${encodeURIComponent(error.replace(/\+/g, " "))}`, request.url));
  if (!code) return NextResponse.redirect(new URL("/reset-password?error=missing_reset_code", request.url));

  try {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    return NextResponse.redirect(new URL("/reset-password", request.url));
  } catch {
    return NextResponse.redirect(new URL("/reset-password?error=reset_link_invalid", request.url));
  }
}
