import { NextResponse } from "next/server";
import { authHeaders, supabaseConfig } from "../../../../lib/supabase-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email } = await request.json() as { email?: string };
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json({ error: "Enter your email address." }, { status: 400 });
    }

    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    const requestOrigin = new URL(request.url).origin;
    const configuredIsLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredAppUrl || "");
    const appUrl = configuredAppUrl && !(process.env.NODE_ENV === "production" && configuredIsLocal)
      ? configuredAppUrl
      : requestOrigin;
    const redirectTo = `${appUrl.replace(/\/$/, "")}/reset-password`;

    const { url } = supabaseConfig();
    const response = await fetch(
      `${url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ email: normalizedEmail }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.msg || data.message || "Unable to send the reset email." },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send the reset email." },
      { status: 500 },
    );
  }
}
