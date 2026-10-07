/**
 * Local demo mode — try the whole app without Google.
 *
 * Both values are inlined at build time. `next build` (and therefore every GitHub Pages
 * deployment) always runs with NODE_ENV="production", so demo mode can never be switched on in
 * the published site, even if NEXT_PUBLIC_LEDGER_DEMO were set by mistake.
 *
 * In demo mode the "spreadsheet" lives in memory and a demo user is signed in automatically.
 */
export const DEMO_MODE =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_LEDGER_DEMO === "1";

export const DEMO_USER = { email: "demo@cinderella.local", name: "示範帳號" } as const;
