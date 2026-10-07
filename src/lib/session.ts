/**
 * Browser-side session store: who is signed in, their Google access token, and a version
 * counter that bumps whenever ledger data changes so views can reload.
 *
 * The access token lives in sessionStorage (cleared when the tab closes) and expires after an
 * hour; Google issues it, and it only works for the sheets the user can already access.
 */

export interface SessionUser {
  email: string;
  name: string;
  picture?: string;
}

interface StoredSession {
  user: SessionUser;
  token: string;
  expiresAt: number;
}

const KEY = "cinderella-ledger-session";

let current: StoredSession | null = null;
let dataVersion = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function read(): StoredSession | null {
  if (current) return current;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || !parsed.user?.email) return null;
    current = parsed;
    return current;
  } catch {
    return null;
  }
}

export function getUser(): SessionUser | null {
  return read()?.user ?? null;
}

/** A token with at least a minute left, or null. */
export function getToken(): string | null {
  const s = read();
  if (!s || s.expiresAt - 60_000 < Date.now()) return null;
  return s.token;
}

export function setSession(user: SessionUser, token: string, expiresInSeconds: number) {
  current = { user, token, expiresAt: Date.now() + expiresInSeconds * 1000 };
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Private mode etc. — the in-memory copy still works for this page.
  }
  emit();
}

/** Keep the user, replace an expired token. */
export function refreshToken(token: string, expiresInSeconds: number) {
  const s = read();
  if (s) setSession(s.user, token, expiresInSeconds);
}

export function clearSession() {
  current = null;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  emit();
}

/** Tell every view that ledger data changed (after a write) so it reloads. */
export function invalidate() {
  dataVersion++;
  emit();
}

export function getDataVersion() {
  return dataVersion;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
