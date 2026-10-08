/**
 * Apps like LINE, Instagram and Facebook open links in their own built-in browser. Google refuses
 * to sign anyone in there (its sign-in window just stays blank), so the login page has to send
 * people to Safari or Chrome first.
 */

export type InAppBrowser = "line" | "other" | null;

const OTHER_APPS = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|MicroMessenger|KAKAOTALK|Threads|BytedanceWebview|musical_ly/i;

export function detectInAppBrowser(userAgent: string): InAppBrowser {
  if (/\bLine\//i.test(userAgent)) return "line";
  if (OTHER_APPS.test(userAgent)) return "other";
  return null;
}

/**
 * LINE opens a URL carrying `openExternalBrowser=1` in the phone's default browser instead of
 * its own (documented LINE behaviour).
 */
export function lineExternalUrl(href: string): string {
  const url = new URL(href);
  url.searchParams.set("openExternalBrowser", "1");
  return url.toString();
}
