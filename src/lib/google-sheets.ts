/**
 * Minimal Google Sheets v4 client that runs in the browser with the signed-in user's own
 * access token. There is no service account and no server: Google decides what this user may do,
 * and only accounts the sheet is shared with as editors can write.
 *
 * All writes use `valueInputOption=RAW`: a customer name such as `=HYPERLINK(...)` is stored as
 * literal text and can never execute as a formula in the owner's spreadsheet.
 */

import { config } from "@/config";
import { DEMO_MODE } from "@/lib/demo";
import { ensureToken } from "@/lib/google-auth";
import { getUser } from "@/lib/session";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

export type CellValue = string | number | boolean;
export type Row = CellValue[];

/** A Sheets failure explained in terms the salon staff can act on. */
export class SheetError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/* ------------------------------------------------- demo (in-memory) backend */

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

async function sheetsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const user = getUser();
  if (!user) throw new SheetError("請先登入", 401);
  const token = await ensureToken(user.email);

  const res = await fetch(`${SHEETS_API}/${config.sheetId}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init?.headers },
  });
  if (res.ok) return (await res.json()) as T;

  if (res.status === 401) throw new SheetError("登入已過期，請重新登入", 401);
  if (res.status === 403) {
    throw new SheetError(
      `${user.email} 沒有「仙度瑞拉帳本」的編輯權限。請店長在試算表按「共用」，把你加為編輯者。`,
      403,
    );
  }
  if (res.status === 404) throw new SheetError("找不到帳本試算表，請確認設定的試算表 ID", 404);
  if (res.status === 429) throw new SheetError("Google 試算表暫時忙碌，請稍等幾秒再試", 429);
  throw new SheetError(`Google 試算表發生錯誤（${res.status}）`, res.status);
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
 * Create any missing tabs with a frozen header row. Runs once per page load.
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
    ensured = null; // let the next attempt retry instead of caching the failure
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
  await sheetsFetch(`/values/${a1(tab, "A1")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ values: rows }),
  });
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
          deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber } },
        })),
    }),
  });
  return numbers.length;
}
