import { NextResponse } from "next/server";
import { getSupabaseAuthUser } from "../../../lib/pixlo-profile";
import { authHeaders, supabaseConfig } from "../../../lib/supabase-config";

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

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: "Files must be 50 MB or smaller." }, { status: 413 });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "upload";
    const objectPath = `${authUser.id}/${crypto.randomUUID()}/${safeName}`;
    const { url, key } = supabaseConfig();
    const uploadUrl = `${url}/storage/v1/object/pixlo-assets/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false",
      },
      body: file,
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json({ error: /bucket|policy|permission|not found/i.test(detail) ? "Cloud media storage is not set up yet. Run the updated supabase/schema.sql in Supabase SQL Editor." : `Upload failed (${response.status}). ${detail.slice(0, 180)}` }, { status: 500 });
    }

    return NextResponse.json({ url: `${url}/storage/v1/object/public/pixlo-assets/${objectPath.split("/").map(encodeURIComponent).join("/")}` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to upload this file." }, { status: 500 });
  }
}
