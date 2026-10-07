import { type NextRequest, NextResponse } from "next/server";

import { DEMO_MODE } from "@/lib/demo";

/**
 * Next.js 16 Proxy (formerly Middleware). Optimistic check only — it looks for the session
 * cookie and bounces obvious anonymous visitors to /login. The real verification (signature,
 * expiry, allow-list) happens in `lib/dal.ts` on every page and server action, as the
 * Next.js docs recommend.
 */
export function proxy(request: NextRequest) {
  if (!DEMO_MODE && !request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except the login page, auth endpoints, Next internals and static brand assets.
  matcher: ["/((?!login|api/auth|_next/static|_next/image|brand/|favicon.ico).*)"],
};
