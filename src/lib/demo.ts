/**
 * Local demo mode — try the whole app before any Google setup exists.
 *
 * Active ONLY when both hold:
 *   - NODE_ENV is "development" (i.e. `npm run dev`; `next build`/`next start` and every Vercel
 *     deployment run as "production", so this can never switch on in a deployed app), and
 *   - LEDGER_DEMO=1 is set explicitly.
 *
 * In demo mode the "spreadsheet" is an in-memory table and everyone is signed in as a demo user.
 * Nothing is written anywhere; restarting the dev server resets the data.
 */
export const DEMO_MODE = process.env.NODE_ENV === "development" && process.env.LEDGER_DEMO === "1";

export const DEMO_USER = { email: "demo@cinderella.local", name: "示範帳號" } as const;
