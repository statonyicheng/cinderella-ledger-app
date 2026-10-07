<!-- AUTO-GENERATED from AGENTS.md — do not edit directly.
     Run `bash scripts/sync-agent-rules.sh` to regenerate. -->

---
description: Project conventions for AI Website Clone Template
alwaysApply: true
---
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 仙度瑞拉記帳 Cinderella Ledger

Internal bookkeeping app for 仙度瑞拉 Cinderella Beauty Salon (a nail salon in Taiwan).
Staff sign in with Google; every income and expense is written straight into one Google Sheet,
which *is* the ledger and is where the owner reconciles. All UI copy is Traditional Chinese.

This project started from the AI website cloner template, but it is **not** a clone project —
the `/clone-website` skill and the platform folders (`.cursor`, `.cline`, …) are template leftovers.
The UI is an original design built from the salon's own CIS.

## Commands
- `npm run demo` — dev server in demo mode on port 3100 (in-memory ledger, auto sign-in, no setup)
- `npm run dev` — dev server against the real sheet (needs `.env.local`, see `.env.example`)
- `npm run check` — lint + typecheck + build

## Architecture
- `src/proxy.ts` — Next 16 Proxy (formerly middleware). **Optimistic** cookie check only.
- `src/lib/dal.ts` — the real auth gate. `requireUser()` must be called by every page and every
  server action; it re-checks the allow-list on each request.
- `src/lib/session.ts` — signed JWT session cookie (`jose`, HS256, 7 days).
- `src/lib/oauth.ts`, `src/app/api/auth/*` — Google OAuth code flow with a `state` cookie.
- `src/lib/google-sheets.ts` — tiny Sheets v4 REST client; service-account JWT signed with `jose`.
  Writes are always `valueInputOption=RAW` (prevents formula injection). Also holds the in-memory
  demo backend.
- `src/lib/ledger.ts` — the domain: tab schemas, reads/writes, monthly summaries.
- `src/app/actions.ts` — server actions; validate with `zod`, then call `ledger.ts`.
- `src/lib/demo.ts` — demo mode is on only when `NODE_ENV === "development"` **and**
  `LEDGER_DEMO=1`. Never weaken the `NODE_ENV` check: it is what keeps demo mode out of production.

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
- Never commit secrets. `.env*` is git-ignored except `.env.example`.
- After editing `AGENTS.md`, run `bash scripts/sync-agent-rules.sh` to regenerate platform-specific
  instruction files.
