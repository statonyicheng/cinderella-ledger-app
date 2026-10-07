import "server-only";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

/**
 * Stateless session: a signed JWT in an httpOnly cookie, following the Next.js 16
 * authentication guide (node_modules/next/dist/docs/01-app/02-guides/authentication.md).
 */

export const SESSION_COOKIE = "session";
const SESSION_DAYS = 7;

export interface SessionUser {
  email: string;
  name: string;
  picture?: string;
}

function key() {
  return new TextEncoder().encode(env.authSecret);
}

export async function encryptSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key());
}

export async function decryptSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.email !== "string" || typeof payload.name !== "string") return null;
    return {
      email: payload.email,
      name: payload.name,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
    };
  } catch {
    return null;
  }
}

export async function createSession(user: SessionUser) {
  const token = await encryptSession(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
