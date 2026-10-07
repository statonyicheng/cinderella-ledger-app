import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { DEMO_MODE, DEMO_USER } from "@/lib/demo";
import { env } from "@/lib/env";
import { decryptSession, SESSION_COOKIE, type SessionUser } from "@/lib/session";

/**
 * Data Access Layer: the real authorization check. `proxy.ts` only does an optimistic
 * cookie-presence redirect; every page and every server action re-verifies here.
 *
 * The allow-list is re-checked on every request (not just at sign-in), so removing an
 * address from ALLOWED_EMAILS revokes access immediately instead of after the 7-day cookie.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (DEMO_MODE) return { ...DEMO_USER };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await decryptSession(token);
  if (!user) return null;
  if (!env.allowedEmails.includes(user.email.toLowerCase())) return null;
  return user;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
