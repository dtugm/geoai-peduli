import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// GeoAI-Peduli adalah viewer publik: semua rute terbuka, tanpa auth.
const allowedDomains = process.env.REDIRECT_DOMAINS?.split(",") ?? [
  "ugmpeduli.geotwinverse.ai",
  "www.ugmpeduli.geotwinverse.ai",
];

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const { pathname } = request.nextUrl;

  const isAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff2?)$/);

  if (isAsset) return NextResponse.next();

  // Domain khusus peduli: root "/" -> "/sumut"
  if (allowedDomains.includes(host!)) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/sumut", request.url));
    }
    return NextResponse.next();
  }

  // Root default -> "/sumut"
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/sumut", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
