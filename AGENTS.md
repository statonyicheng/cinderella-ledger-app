<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 仙度瑞拉記帳 Cinderella Ledger

Internal bookkeeping app for 仙度瑞拉 Cinderella Beauty Salon (a nail salon in Taiwan).
Staff sign in with Google; every income and expense is written straight into one Google Sheet,
which *is* the ledger and is where the owner reconciles. All UI copy is Traditional Chinese.
Hosted on GitHub Pages: https://statonyicheng.github.io/cinderella-ledger-app/

This project started from the AI website cloner template, but it is **not** a clone project —
the `/clone-website` skill and the platform folders (`.cursor`, `.cline`, …) are template leftovers.
The UI is an original design built from the salon's own CIS.

## Commands
- `npm run demo` — dev server in demo mode on port 3100 (in-memory ledger, auto sign-in, no setup)
- `npm run dev` — dev server against the real sheet; sign in with a Google test user
- `npm run check` — lint + typecheck + static build into `out/`
- Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy-pages.yml`)

## Architecture
**Fully static, no server.** `next.config.ts` sets `output: "export"`, so there are no Server
Actions, Route Handlers that read requests, Proxy, cookies, or image optimizer. Every page is a thin
server component that renders a `"use client"` view; all data work happens in the browser.

- `src/config.ts` — public config: OAuth client ID, sheet ID, staff allow-list, base path. Nothing
  here is secret. Never add a secret anywhere in this repo: everything ships to the browser.
- `src/lib/google-auth.ts` — Google Identity Services token model. Requests the `spreadsheets`
  scope; no client secret, no redirect URI. Silent refresh before the 1-hour token expires.
- `src/lib/session.ts` — user + access token in `sessionStorage`, with a subscribe/version store
  that `src/lib/use-ledger.ts` uses to re-fetch after writes.
- `src/lib/google-sheets.ts` — tiny Sheets v4 REST client called with the signed-in user's token.
  Writes are always `valueInputOption=RAW` (prevents formula injection). Also holds the in-memory
  demo backend.
- `src/lib/ledger.ts` — the domain: tab schemas, reads/writes, monthly summaries.
- `src/lib/actions.ts` — form handlers used with `useActionState`; validate with `zod`, then call
  `ledger.ts`.
- `src/lib/demo.ts` — demo mode is on only when `NODE_ENV === "development"` **and**
  `NEXT_PUBLIC_LEDGER_DEMO=1`. Never weaken the `NODE_ENV` check: it is what keeps demo mode out of
  production.

**The security boundary is Google, not this code.** Only accounts the sheet is shared with (as
Editor) can read or write it, and while the OAuth app is in Testing mode only listed test users can
sign in. `config.allowedEmails` is a courtesy check for a clear error message, not access control.

**Base path.** GitHub Pages serves the site under `/cinderella-ledger-app`. `next/link` and
`next/navigation` add it automatically; plain string URLs to `/public` files must go through
`asset()` from `src/config.ts`.

## Sheet contract
Column A of every record tab is the row ID; row 1 is the header. Code locates rows by ID, so never
reorder or rename columns without migrating the owner's existing sheet. Tabs are created on first
use and existing tabs are never modified structurally.

## Code style
- TypeScript strict, no `any`. Named exports for components; default exports only where Next
  requires them (pages, layouts, route handlers).
- Tailwind v4 utilities and the brand tokens in `src/app/globals.css` (`ink`, `marble`, `nude-*`,
  `gold-*`). Mobile-first; the phone layout is the primary one.
- Money is integer NTD. Dates are ISO `YYYY-MM-DD` in Asia/Taipei (`src/lib/format.ts`).

## Design principles
- Brand: ink line of the crest, marble plate, nude-pink nails, champagne-gold foil. Serif
  (Noto Serif TC) for headings and figures, Noto Sans TC for body text.
- Calm and legible for someone standing at a work table with one free hand.

## MOST IMPORTANT NOTES
- Never commit secrets. `.env*` is git-ignored except `.env.example`. This app needs no secrets at
  all; if a change seems to need one, it needs a server, which this project deliberately does not have.
- After editing `AGENTS.md`, run `bash scripts/sync-agent-rules.sh` to regenerate platform-specific
  instruction files.
