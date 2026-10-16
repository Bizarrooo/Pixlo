import { NextResponse } from "next/server";
import { supabaseConfig } from "../../../../lib/supabase-config";
import { serverEnv } from "../../../../lib/server-env";

export const runtime = "nodejs";
export const revalidate = 300;

type StorageEntry = { name?: unknown; id?: unknown; metadata?: unknown };

async function countStorageFiles(url: string, serviceKey: string): Promise<number | null> {
  try {
    const pendingPrefixes = [""];
    const seenPrefixes = new Set<string>([""]);
    let totalFiles = 0;
    let requests = 0;

    while (pendingPrefixes.length) {
      const batch = pendingPrefixes.splice(0, 8);
      const results = await Promise.all(batch.map(async prefix => {
        const entriesForPrefix: StorageEntry[] = [];
        let offset = 0;
        while (true) {
          requests += 1;
          if (requests > 250) return null;

          const response = await fetch(`${url}/storage/v1/object/list/pixlo-assets`, {
            method: "POST",
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
            cache: "no-store",
          });
          if (!response.ok) return null;
          const entries: unknown = await response.json().catch(() => null);
          if (!Array.isArray(entries)) return null;
          entriesForPrefix.push(...entries as StorageEntry[]);
          if (entries.length < 1000) break;
          offset += entries.length;
        }
        return { prefix, entries: entriesForPrefix };
      }));

      if (results.some(result => result === null)) return null;
      for (const result of results) {
        if (!result) continue;
        for (const entry of result.entries) {
          if (!entry || typeof entry.name !== "string" || !entry.name) continue;
          const isFolder = entry.id == null && entry.metadata == null;
          if (isFolder) {
            const childPrefix = `${result.prefix}${entry.name}/`;
            if (!seenPrefixes.has(childPrefix)) {
              seenPrefixes.add(childPrefix);
              pendingPrefixes.push(childPrefix);
            }
          } else {
            totalFiles += 1;
          }
        }
      }
    }
    return totalFiles;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      return NextResponse.json({ fileUploads: null }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
    }
    const { url } = supabaseConfig();
    const fileUploads = await countStorageFiles(url, serviceKey);
    return NextResponse.json(
      { fileUploads },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch {
    return NextResponse.json({ error: "Upload statistics are temporarily unavailable." }, { status: 500 });
  }
}
