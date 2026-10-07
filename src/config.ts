/**
 * Public configuration. Everything here ships to the browser, and none of it is a secret:
 *
 * - The OAuth client ID identifies the app to Google; on its own it grants nothing.
 * - The sheet ID is useless without access: Google only lets accounts the sheet is shared with
 *   read or write it. Sheet sharing is the real access control in this app.
 * - The allow-list is a convenience check so non-staff get a clear message instead of a
 *   Google permission error. It is NOT the security boundary — sheet sharing is.
 */

export const config = {
  /** Google Cloud → Google Auth Platform → Clients → (Web application) client ID. */
  googleClientId:
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
    "560117174011-ed6rq5alpeqh9383bbjv9savbre4r3pu.apps.googleusercontent.com",

  /** 「仙度瑞拉帳本」 owned by staton.yicheng@gmail.com. */
  sheetId: process.env.NEXT_PUBLIC_SHEET_ID ?? "1oExsmQGsMiOi1eBVqvqyqaL-lutWVNziR4b9L773av0",

  /** Lower-case Gmail addresses that may use the app. Each must also be an editor of the sheet. */
  allowedEmails: ["staton.yicheng@gmail.com", "wwijk1ll@gmail.com", "cinderella1438@gmail.com"],

  /** GitHub Pages serves the site under /<repo>; set by the deploy workflow, empty locally. */
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
} as const;

/** Prefix a /public path with the base path (next/image does not do this for string sources). */
export function asset(path: string): string {
  return `${config.basePath}${path}`;
}

export function spreadsheetUrl(): string {
  return `https://docs.google.com/spreadsheets/d/${config.sheetId}/edit`;
}

export function isAllowed(email: string): boolean {
  return (config.allowedEmails as readonly string[]).includes(email.trim().toLowerCase());
}
