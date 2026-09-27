import { NextResponse, type NextRequest } from "next/server";

const isDev = process.env.NODE_ENV === "development";
const SESSION_COOKIE = isDev ? "ay_session" : "__Host-ay_session";

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Dev HMR injects <style> tags without a nonce.
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    // next/image and a few components set style attributes (no script execution possible).
    "style-src-attr 'unsafe-inline'",
    // Map tiles for the shop location (contact page and admin settings).
    "img-src 'self' data: blob: https://trustseal.enamad.ir https://tile.openstreetmap.org",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://payment.zarinpal.com https://sandbox.zarinpal.com",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Optimistic gate only — every protected page and action re-checks the session in the database.
  const needsAuth = pathname.startsWith("/admin") || pathname.startsWith("/profile") || pathname.startsWith("/checkout");
  if (needsAuth && !request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  if (pathname.startsWith("/admin") || pathname.startsWith("/profile") || pathname.startsWith("/checkout")) {
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|brand/|banners/|images/|media/|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
