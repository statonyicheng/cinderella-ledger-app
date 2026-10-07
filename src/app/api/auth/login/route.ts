import { type NextRequest, NextResponse } from "next/server";

import { googleAuthorizeUrl, STATE_COOKIE } from "@/lib/oauth";

/** Start Google sign-in. A random `state` bound to an httpOnly cookie blocks login CSRF. */
export function GET(request: NextRequest) {
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(googleAuthorizeUrl(request, state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 10 * 60,
  });
  return response;
}
