/**
 * Google sign-in in the browser via Google Identity Services (token model).
 *
 * No client secret and no server: Google returns a short-lived access token straight to the page.
 * The token carries the signed-in user's own permissions, so it can only touch spreadsheets that
 * person can already edit.
 */

import { config } from "@/config";
import { clearSession, getToken, refreshToken, type SessionUser, setSession } from "@/lib/session";

const GIS_SRC = "https://accounts.google.com/gsi/client";
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string; login_hint?: string }): void;
}

interface GoogleOAuth2 {
  initTokenClient(options: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message?: string }) => void;
  }): TokenClient;
  revoke(token: string, done?: () => void): void;
}

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth2 } };
  }
}

let gisLoading: Promise<GoogleOAuth2> | null = null;

function loadGis(): Promise<GoogleOAuth2> {
  gisLoading ??= new Promise<GoogleOAuth2>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve(window.google.accounts.oauth2);
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => {
      const oauth2 = window.google?.accounts?.oauth2;
      if (oauth2) resolve(oauth2);
      else reject(new Error("Google 登入元件載入失敗"));
    };
    script.onerror = () => reject(new Error("無法連到 Google 登入服務，請檢查網路"));
    document.head.appendChild(script);
  }).catch((error) => {
    gisLoading = null;
    throw error;
  });
  return gisLoading;
}

export class SignInError extends Error {
  constructor(
    message: string,
    readonly code: "cancelled" | "not_configured" | "not_allowed" | "failed",
  ) {
    super(message);
  }
}

/** Open Google's popup and resolve with a fresh access token. */
async function requestToken(prompt: "" | "consent" | "select_account", loginHint?: string) {
  if (!config.googleClientId) {
    throw new SignInError("尚未設定 Google 用戶端 ID（NEXT_PUBLIC_GOOGLE_CLIENT_ID）", "not_configured");
  }
  const oauth2 = await loadGis();
  return new Promise<{ token: string; expiresIn: number }>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: config.googleClientId,
      scope: SCOPES,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new SignInError(response.error_description || "Google 登入失敗", "failed"));
          return;
        }
        resolve({ token: response.access_token, expiresIn: response.expires_in ?? 3600 });
      },
      error_callback: (error) => {
        reject(
          new SignInError(
            error.type === "popup_closed" ? "已關閉 Google 登入視窗" : "Google 登入視窗無法開啟，請允許彈出式視窗",
            error.type === "popup_closed" ? "cancelled" : "failed",
          ),
        );
      },
    });
    client.requestAccessToken({ prompt, login_hint: loginHint });
  });
}

async function fetchProfile(token: string): Promise<SessionUser> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new SignInError("無法取得 Google 帳號資料", "failed");
  const p = (await res.json()) as { email?: string; email_verified?: boolean; name?: string; picture?: string };
  if (!p.email || p.email_verified === false) throw new SignInError("這個 Google 帳號沒有驗證過的 email", "failed");
  return { email: p.email.toLowerCase(), name: p.name || p.email, picture: p.picture };
}

/**
 * Full sign-in: popup → token → profile → allow-list check → session.
 * The allow-list is a courtesy check; Google's sheet sharing is what actually grants write access.
 */
export async function signIn(isAllowed: (email: string) => boolean): Promise<SessionUser> {
  const { token, expiresIn } = await requestToken("select_account");
  const user = await fetchProfile(token);
  if (!isAllowed(user.email)) {
    window.google?.accounts?.oauth2?.revoke(token);
    throw new SignInError(`${user.email} 沒有使用權限。請聯絡店長把你的 Gmail 加入名單。`, "not_allowed");
  }
  setSession(user, token, expiresIn);
  return user;
}

/**
 * A usable token, renewing an expired one. Google usually renews without showing anything for
 * an account that already consented; if it can't, the popup appears again.
 */
export async function ensureToken(email: string): Promise<string> {
  const existing = getToken();
  if (existing) return existing;
  const { token, expiresIn } = await requestToken("", email);
  refreshToken(token, expiresIn);
  return token;
}

export function signOut() {
  const token = getToken();
  if (token) window.google?.accounts?.oauth2?.revoke(token);
  clearSession();
}
