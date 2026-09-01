import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (!session && !isAuthPage) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Deliberately NOT bouncing an already-"signed in" visitor away from
  // /login or /signup here: this edge check only verifies the JWT's
  // signature, not that its user still exists/is approved (that needs the
  // DB, which isn't available at the edge). A stale or orphaned token would
  // otherwise ping-pong forever — proxy.ts sends it to /transactions,
  // requireSession()'s real DB check bounces it right back to /login. The
  // login/signup pages themselves do this redirect with a real session
  // lookup instead (see their page.tsx).

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico).*)"],
};
