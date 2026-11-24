import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readToken } from "./lib/token";

/** Everything except /login needs a valid session. */
export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/login")) return NextResponse.next();
  if (readToken(req.cookies.get(SESSION_COOKIE.name)?.value)) return NextResponse.next();
  const url = new URL("/login", req.url);
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next|icons|brand|favicon|robots.txt|api/health).*)"] };
