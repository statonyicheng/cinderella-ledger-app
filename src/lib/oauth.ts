import "server-only";

import type { NextRequest } from "next/server";

import { env } from "@/lib/env";

export const STATE_COOKIE = "oauth_state";

/** The redirect URI must match one registered on the Google OAuth client exactly. */
export function callbackUrl(request: NextRequest): string {
  const origin = env.appUrl ?? request.nextUrl.origin;
  return `${origin}/api/auth/callback`;
}

export function googleAuthorizeUrl(request: NextRequest, state: string): string {
  const params = new URLSearchParams({
    client_id: env.googleOAuthClientId,
    redirect_uri: callbackUrl(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export interface GoogleProfile {
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

/**
 * Exchange the one-time code for tokens, then read the profile from Google's userinfo
 * endpoint. Both calls go server-to-Google over TLS, so the profile cannot be forged by
 * the browser.
 */
export async function fetchGoogleProfile(request: NextRequest, code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleOAuthClientId,
      client_secret: env.googleOAuthClientSecret,
      redirect_uri: callbackUrl(request),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) throw new Error(`Google code exchange failed (${tokenRes.status})`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${access_token}` },
    cache: "no-store",
  });
  if (!profileRes.ok) throw new Error(`Google userinfo failed (${profileRes.status})`);
  const profile = (await profileRes.json()) as {
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!profile.email) throw new Error("Google profile has no email");

  return {
    email: profile.email.toLowerCase(),
    emailVerified: profile.email_verified === true,
    name: profile.name || profile.email,
    picture: profile.picture,
  };
}
