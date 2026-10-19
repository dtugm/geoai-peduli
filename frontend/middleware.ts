import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// GeoAI-Peduli adalah viewer publik: semua rute terbuka, tanpa auth.

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff2?)$/);

  if (isAsset) return NextResponse.next();

  // Root "/" menampilkan landing page + katalog analisis, untuk semua domain
  // (termasuk ugmpeduli.geotwinverse.ai) — tidak lagi di-redirect ke /sumut.
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
