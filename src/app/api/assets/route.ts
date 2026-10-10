import { NextResponse } from "next/server";
import { getSupabaseAuthUser } from "../../../lib/pixlo-profile";
import { supabaseConfig } from "../../../lib/supabase-config";

export const runtime = "nodejs";

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const value = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] || "";
  try { return decodeURIComponent(value); } catch { return value; }
}

export async function POST(request: Request) {
  try {
    const accessToken = cookieValue(request, "pixlo_access_token");
    if (!accessToken) return NextResponse.json({ error: "Sign in to upload profile media." }, { status: 401 });
    const authUser = await getSupabaseAuthUser(accessToken);
    if (!authUser) return NextResponse.json({ error: "Your session expired. Sign in again." }, { status: 401 });

    const input = await request.json().catch(() => null) as { name?: unknown; type?: unknown; size?: unknown } | null;
    if (!input || typeof input.name !== "string" || typeof input.type !== "string" || typeof input.size !== "number") {
      return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    }
    if (input.size <= 0) return NextResponse.json({ error: "This file is empty." }, { status: 400 });
    if (input.size > 50 * 1024 * 1024) return NextResponse.json({ error: "Files must be 50 MB or smaller." }, { status: 413 });

    const safeName = input.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "upload";
    const objectPath = `${authUser.id}/${crypto.randomUUID()}/${safeName}`;
    const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
    const { url, key } = supabaseConfig();
    const signResponse = await fetch(`${url}/storage/v1/object/upload/sign/pixlo-assets/${encodedPath}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ upsert: false }),
      cache: "no-store",
    });
    const signData = await signResponse.json().catch(() => ({}));
    if (!signResponse.ok || typeof signData.token !== "string") {
      const detail = typeof signData.message === "string" ? signData.message : typeof signData.error === "string" ? signData.error : "";
      const message = /bucket|policy|permission|not found/i.test(detail)
        ? "Cloud media storage is not configured correctly. Check the pixlo-assets bucket and its upload policy in Supabase."
        : detail || `Could not prepare the upload (${signResponse.status}).`;
      return NextResponse.json({ error: message }, { status: signResponse.status >= 400 && signResponse.status < 600 ? signResponse.status : 500 });
    }

    const uploadUrl = `${url}/storage/v1/object/upload/sign/pixlo-assets/${encodedPath}?token=${encodeURIComponent(signData.token)}`;
    const publicUrl = `${url}/storage/v1/object/public/pixlo-assets/${encodedPath}`;
    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare this upload." }, { status: 500 });
  }
}
