import "server-only";

import { importPKCS8, SignJWT } from "jose";

import { DEMO_MODE } from "@/lib/demo";
import { env } from "@/lib/env";

/**
 * Minimal Google Sheets v4 client over REST, authenticated as a service account.
 *
 * The service-account JWT is signed with `jose` (already used for sessions), which avoids
 * pulling in the very large `googleapis` package for the handful of calls we need.
 *
 * All writes use `valueInputOption=RAW`: a customer name such as `=HYPERLINK(...)` is stored
 * as literal text and can never execute as a formula in the owner's spreadsheet.
 */

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export type CellValue = string | number | boolean;
export type Row = CellValue[];

/* ------------------------------------------------- demo (in-memory) backend */

// Kept on globalThis so it survives dev-server hot reloads. Row 0 of each tab is the header.
const memory = globalThis as unknown as { __ledgerDemoSheet?: Map<string, Row[]> };
function demoSheet(): Map<string, Row[]> {
  return (memory.__ledgerDemoSheet ??= new Map<string, Row[]>());
}

const demo = {
  ensureTabs(schema: Record<string, readonly string[]>) {
    for (const [tab, header] of Object.entries(schema)) {
      if (!demoSheet().has(tab)) demoSheet().set(tab, [[...header]]);
    }
  },
  readRows: (tab: string) => (demoSheet().get(tab) ?? []).slice(1).map((r) => [...r]),
  appendRows(tab: string, rows: Row[]) {
    demoSheet().get(tab)?.push(...rows.map((r) => [...r]));
  },
  updateRowById(tab: string, id: string, row: Row) {
    const rows = demoSheet().get(tab) ?? [];
    const index = rows.findIndex((r, i) => i > 0 && String(r[0]) === id);
    if (index < 0) return false;
    rows[index] = [...row];
    return true;
  },
  deleteRowsById(tab: string, id: string) {
    const rows = demoSheet().get(tab) ?? [];
    const kept = rows.filter((r, i) => i === 0 || String(r[0]) !== id);
    demoSheet().set(tab, kept);
    return rows.length - kept.length;
  },
};

/* ------------------------------------------------------- Google backend */

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) return cachedToken.value;

  const privateKey = await importPKCS8(env.serviceAccountPrivateKey, "RS256");
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.serviceAccountEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

async function sheetsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SHEETS_API}/${env.sheetId}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${await accessToken()}`,
      "content-type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Google Sheets request failed (${res.status} ${path}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** Quote a tab name for A1 notation so Chinese names and spaces are safe. */
function a1(tab: string, range = "A:Z") {
  return encodeURIComponent(`'${tab.replace(/'/g, "''")}'!${range}`);
}

interface SheetMeta {
  sheets: { properties: { sheetId: number; title: string } }[];
}

async function sheetIds(): Promise<Map<string, number>> {
  const meta = await sheetsFetch<SheetMeta>("?fields=sheets.properties(sheetId,title)");
  return new Map(meta.sheets.map((s) => [s.properties.title, s.properties.sheetId]));
}

/**
 * Create any missing tabs and give each a frozen header row. Runs once per server instance.
 * Existing tabs and their data are never touched.
 */
let ensured: Promise<void> | null = null;
export function ensureTabs(schema: Record<string, readonly string[]>): Promise<void> {
  if (DEMO_MODE) return Promise.resolve(demo.ensureTabs(schema));
  ensured ??= (async () => {
    const existing = await sheetIds();
    const missing = Object.keys(schema).filter((tab) => !existing.has(tab));
    if (missing.length === 0) return;

    await sheetsFetch(":batchUpdate", {
      method: "POST",
      body: JSON.stringify({
        requests: missing.map((title) => ({
          addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } },
        })),
      }),
    });
    await sheetsFetch("/values:batchUpdate", {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: missing.map((tab) => ({ range: `'${tab}'!A1`, values: [schema[tab]] })),
      }),
    });
  })().catch((error) => {
    ensured = null; // let the next request retry instead of caching the failure
    throw error;
  });
  return ensured;
}

/** All data rows of a tab (header row excluded). */
export async function readRows(tab: string): Promise<Row[]> {
  if (DEMO_MODE) return demo.readRows(tab);
  const data = await sheetsFetch<{ values?: Row[] }>(
    `/values/${a1(tab)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`,
  );
  return (data.values ?? []).slice(1);
}

export async function appendRows(tab: string, rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  if (DEMO_MODE) return demo.appendRows(tab, rows);
  await sheetsFetch(
    `/values/${a1(tab, "A1")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: rows }) },
  );
}

/** 1-based sheet row numbers (header is row 1) of every row whose column A equals `id`. */
async function rowNumbersById(tab: string, id: string): Promise<number[]> {
  const rows = await readRows(tab);
  const numbers: number[] = [];
  rows.forEach((row, index) => {
    if (String(row[0]) === id) numbers.push(index + 2);
  });
  return numbers;
}

export async function updateRowById(tab: string, id: string, row: Row): Promise<boolean> {
  if (DEMO_MODE) return demo.updateRowById(tab, id, row);
  const [rowNumber] = await rowNumbersById(tab, id);
  if (!rowNumber) return false;
  await sheetsFetch(`/values/${a1(tab, `A${rowNumber}`)}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [row] }),
  });
  return true;
}

/** Delete every row whose column A equals `id` (bottom-up so indices stay valid). */
export async function deleteRowsById(tab: string, id: string): Promise<number> {
  if (DEMO_MODE) return demo.deleteRowsById(tab, id);
  const numbers = await rowNumbersById(tab, id);
  if (numbers.length === 0) return 0;
  const sheetId = (await sheetIds()).get(tab);
  if (sheetId === undefined) return 0;

  await sheetsFetch(":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: numbers
        .sort((a, b) => b - a)
        .map((rowNumber) => ({
          deleteDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber },
          },
        })),
    }),
  });
  return numbers.length;
}

export function spreadsheetUrl() {
  if (DEMO_MODE) return "https://docs.google.com/spreadsheets/";
  return `https://docs.google.com/spreadsheets/d/${env.sheetId}/edit`;
}
