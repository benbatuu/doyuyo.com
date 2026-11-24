import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { isPublishedLocale } from "@doyuyo/i18n";
import { container } from "@doyuyo/infrastructure";
import { normalizePath } from "@doyuyo/core";
import { routing } from "./i18n/routing";
import { SITE_URL } from "./lib/seo";

const intl = createMiddleware(routing);

/** Redirect table kept in memory (≈760 rows) and refreshed every 5 minutes. */
const TTL = 5 * 60_000;
let table: { map: Map<string, { to: string; status: number }>; at: number } | null = null;
async function redirects() {
  if (!table || Date.now() - table.at > TTL) {
    const rows = await container().routes.listRedirects();
    table = { map: new Map(rows.map((r) => [r.from, { to: r.to, status: r.status }])), at: Date.now() };
  }
  return table.map;
}

/**
 * 1. Legacy / renamed URLs: one-hop redirect from the table (before any rendering).
 * 2. "/" and locale-prefixed paths: next-intl (locale detection, prefix).
 * 3. Anything else: localized 404.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // www.doyuyo.com -> doyuyo.com (one canonical host)
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const canonicalHost = new URL(SITE_URL).host;
  if (host === `www.${canonicalHost}`) return NextResponse.redirect(`${SITE_URL}${pathname}${request.nextUrl.search}`, 301);
  const path = normalizePath(pathname);
  if (path !== "/") {
    const map = await redirects();
    const hit = map.get(path) ?? map.get(path.toLocaleLowerCase("tr"));
    if (hit) {
      if (hit.status === 410) return new NextResponse(null, { status: 410 });
      const url = request.nextUrl.clone();
      url.pathname = hit.to;
      url.search = "";
      return NextResponse.redirect(url, hit.status === 302 ? 302 : 301);
    }
  }
  const first = pathname.split("/")[1];
  if (pathname === "/" || isPublishedLocale(first)) return intl(request);
  return NextResponse.rewrite(new URL(`/tr/__not-found${pathname}`, request.url));
}

export const config = {
  // Skip Next internals, API, static files and media.
  matcher: ["/((?!_next|api|media|vendor|icons|favicon|manifest.webmanifest|robots.txt|sitemap|.*\\.[a-zA-Z0-9]{2,5}$).*)"],
};
