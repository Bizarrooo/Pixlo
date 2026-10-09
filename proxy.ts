import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "./src/lib/supabase/proxy";

const CANONICAL_HOST = "pixlo1.vercel.app";

export async function proxy(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();

  // Keep every public visit on Pixlo's permanent production domain.
  // Vercel deployment and preview URLs redirect while preserving the path and query.
  if (hostname.endsWith(".vercel.app") && hostname !== CANONICAL_HOST) {
    const destination = request.nextUrl.clone();
    destination.protocol = "https:";
    destination.hostname = CANONICAL_HOST;
    destination.port = "";
    return NextResponse.redirect(destination, 308);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
