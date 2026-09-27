import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/** Routes that anyone can open. Everything else requires a session. */
const PUBLIC_PATHS = ["/", "/about", "/login", "/forgot-password", "/reset-password"];
const PUBLIC_API_PREFIXES = ["/api/auth/login", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/public/"];

/**
 * Optimistic gatekeeper: redirects visitors without a session cookie away from
 * private pages. It never trusts the cookie — the session itself is validated
 * against the database in every page, server action and API handler.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic =
    PUBLIC_PATHS.includes(pathname) || PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isPublic && !hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname + request.nextUrl.search);
  const response = NextResponse.next({ request: { headers } });
  // Private community data must never be indexed.
  if (!isPublic) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (!isPublic || pathname.startsWith("/api/")) response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|icon.svg|.*\.(?:png|jpg|svg|webp|ico)$).*)"],
};
