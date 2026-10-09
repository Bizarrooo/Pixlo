import { NextResponse } from "next/server";
import { serverEnv } from "../../../../../lib/server-env";

export const runtime = "nodejs";

export async function GET() {
  const clientId = serverEnv("DISCORD_CLIENT_ID");
  const clientSecret = serverEnv("DISCORD_CLIENT_SECRET");
  return NextResponse.json({
    clientIdConfigured: Boolean(clientId),
    clientSecretConfigured: Boolean(clientSecret && !clientSecret.includes("PASTE_YOUR") && !clientSecret.includes("YOUR_DISCORD_APPLICATION")),
  });
}
