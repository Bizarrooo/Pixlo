import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { serverEnv } from "../../../../../lib/server-env";
import { supabaseConfig } from "../../../../../lib/supabase-config";

export const runtime = "nodejs";

const OWNER_USER_ID = "3f29f647-4b99-4f53-adf0-eb678bef1c5f";
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  const value = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] || "";
  try { return decodeURIComponent(value); } catch { return value; }
}

export async function POST(request: Request) {
  const accessToken = cookieValue(request, "pixlo_access_token");
  if (!accessToken) return NextResponse.json({ error: "Sign in to upload badge icons." }, { status: 401 });
  const { url: supabaseUrl, key } = supabaseConfig();
  const auth = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!auth.ok) return NextResponse.json({ error: "Your Pixlo session expired. Sign in again." }, { status: 401 });
  const user = await auth.json().catch(() => null);
  if (user?.id !== OWNER_USER_ID) return NextResponse.json({ error: "Only the Pixlo owner can upload badge icons." }, { status: 403 });

  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return NextResponse.json({ error: "Badge uploads are not configured on the server." }, { status: 503 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image file first." }, { status: 400 });
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) return NextResponse.json({ error: "Use a PNG, JPG, WebP, or GIF image." }, { status: 400 });
  if (file.size < 1 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Badge icons must be smaller than 2 MB." }, { status: 400 });

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const bucketUrl = `${supabaseUrl}/storage/v1/bucket`;
  const check = await fetch(`${bucketUrl}/badge-icons`, { headers, cache: "no-store" });
  if (check.status === 404) {
    const create = await fetch(bucketUrl, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ id: "badge-icons", name: "badge-icons", public: true, file_size_limit: MAX_FILE_SIZE, allowed_mime_types: Object.keys(ALLOWED_TYPES) }), cache: "no-store" });
    if (!create.ok && create.status !== 409) {
      const detail = (await create.text().catch(() => "")).slice(0, 240);
      return NextResponse.json({ error: "Could not create the badge icon storage bucket (HTTP " + create.status + "). " + detail }, { status: 503 });
    }
  } else if (!check.ok) {
    const detail = (await check.text().catch(() => "")).slice(0, 240);
    return NextResponse.json({ error: "Could not access badge icon storage (HTTP " + check.status + "). " + detail }, { status: 503 });
  }

  const objectPath = `${randomUUID()}.${extension}`;
  const upload = await fetch(`${supabaseUrl}/storage/v1/object/badge-icons/${objectPath}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": file.type, "x-upsert": "false" },
    body: await file.arrayBuffer(),
    cache: "no-store",
  });
  if (!upload.ok) {
    const detail = (await upload.text().catch(() => "")).slice(0, 240);
    return NextResponse.json({ error: "The icon upload failed (HTTP " + upload.status + "). " + detail }, { status: 503 });
  }
  return NextResponse.json({ url: `${supabaseUrl}/storage/v1/object/public/badge-icons/${objectPath}` });
}
