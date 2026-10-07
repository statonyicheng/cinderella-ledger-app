import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { fetchGoogleProfile, STATE_COOKIE } from "@/lib/oauth";
import { createSession } from "@/lib/session";

function toLogin(request: NextRequest, error: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
  response.cookies.delete({ name: STATE_COOKIE, path: "/api/auth" });
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (searchParams.get("error")) return toLogin(request, "cancelled");
  if (!code || !state || !expectedState || state !== expectedState) return toLogin(request, "state");

  let profile;
  try {
    profile = await fetchGoogleProfile(request, code);
  } catch (error) {
    console.error("[auth] Google sign-in failed:", error);
    return toLogin(request, "google");
  }

  if (!profile.emailVerified || !env.allowedEmails.includes(profile.email)) {
    console.warn(`[auth] Rejected sign-in for ${profile.email} (not on ALLOWED_EMAILS)`);
    return toLogin(request, "not_allowed");
  }

  await createSession({ email: profile.email, name: profile.name, picture: profile.picture });
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete({ name: STATE_COOKIE, path: "/api/auth" });
  return response;
}
