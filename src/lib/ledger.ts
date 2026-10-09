import {
  appendRows,
  deleteRowsById,
  ensureTabs,
  readRows,
  readTabs,
  type Row,
  updateRowById,
} from "@/lib/google-sheets";
import { DEMO_MODE, DEMO_USER } from "@/lib/demo";
import { monthOf, nowStamp, todayISO } from "@/lib/format";

/**
 * The ledger lives entirely in one Google Sheet. Each tab is a human-readable table so the
 * owner can reconcile directly in Sheets; the app is just a friendlier way to write to it.
 *
 *   收入      one row per visit (the reconciliation view)
 *   收入明細  one row per service line, keyed by 收入ID (feeds the service ranking)
 *   成本      one row per expense
 *   服務項目 / 付款方式 / 成本類型 / 美甲師   editable pick-lists
 *   工作室設定  key/value settings
 */

export const TABS = {
  income: "收入",
  incomeItems: "收入明細",
  expense: "成本",
  services: "服務項目",
  paymentMethods: "付款方式",
  expenseCategories: "成本類型",
  artists: "美甲師",
  settings: "工作室設定",
} as const;

const SCHEMA: Record<string, readonly string[]> = {
  [TABS.income]: ["ID", "日期", "客戶姓名", "付款方式", "服務項目", "實收金額", "服務成本", "促銷折扣", "備註", "建立者", "建立時間", "更新時間", "美甲師"],
  [TABS.incomeItems]: ["收入ID", "日期", "服務項目", "實收金額", "服務成本"],
  [TABS.expense]: ["ID", "日期", "成本類型", "金額", "備註", "建立者", "建立時間", "更新時間"],
  [TABS.services]: ["名稱"],
  [TABS.paymentMethods]: ["名稱"],
  [TABS.expenseCategories]: ["名稱"],
  [TABS.artists]: ["名稱"],
  [TABS.settings]: ["鍵", "值"],
};

/**
 * Seeded once, the first time a pick-list tab is found empty. Fully editable in 設定.
 * 美甲師 has no defaults: the owner adds the real names.
 */
const DEFAULT_LISTS: Record<string, string[]> = {
  [TABS.services]: ["單色凝膠", "漸層", "法式", "造型設計", "延甲", "卸甲", "保養", "飾品加購"],
  [TABS.paymentMethods]: ["現金", "轉帳", "刷卡", "LINE Pay", "其他"],
  [TABS.expenseCategories]: ["耗材", "工具設備", "店租", "水電", "行銷廣告", "教育進修", "平台手續費", "其他"],
};

export type PickList = "services" | "paymentMethods" | "expenseCategories" | "artists";

export interface IncomeItem {
  service: string;
  amount: number;
  cost: number;
}

export interface IncomeRecord {
  kind: "income";
  id: string;
  date: string;
  customer: string;
  /** The nail artist who served this visit; the basis for profit sharing. */
  artist: string;
  paymentMethod: string;
  items: IncomeItem[];
  amount: number;
  cost: number;
  discount: number;
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface ExpenseRecord {
  kind: "expense";
  id: string;
  date: string;
  category: string;
  amount: number;
  note: string;
  createdBy: string;
  createdAt: string;
}

export type LedgerRecord = IncomeRecord | ExpenseRecord;

/**
 * Every read and write waits for this. In demo mode it also waits for the sample data, so a
 * request that arrives while seeding is still running can't read a half-filled ledger.
 */
const seed = globalThis as unknown as { __ledgerDemoSeed?: Promise<void> };
async function ready() {
  await ensureTabs(SCHEMA);
  if (DEMO_MODE) await (seed.__ledgerDemoSeed ??= seedDemo());
}

/**
 * Demo mode only: a few made-up visits and expenses this month so every screen has content.
 * Writes rows directly rather than through createIncome/createExpense, which call ready() and
 * would wait on this very promise.
 */
async function seedDemo() {
  const month = todayISO().slice(0, 7);
  const day = (d: number) => `${month}-${String(Math.min(d, Number(todayISO().slice(8)))).padStart(2, "0")}`;
  await appendRows(TABS.artists, [["小芸"], ["Mia"]]);
  const visits: [number, string, string, string, [string, number, number][], number][] = [
    [1, "林小姐", "小芸", "LINE Pay", [["單色凝膠", 1200, 120]], 0],
    [2, "陳小姐", "Mia", "現金", [["法式", 1500, 150], ["飾品加購", 300, 60]], 100],
    [3, "王小姐", "小芸", "刷卡", [["造型設計", 2200, 260]], 0],
    [3, "張小姐", "Mia", "轉帳", [["卸甲", 300, 20], ["漸層", 1400, 140]], 0],
    [5, "黃小姐", "小芸", "LINE Pay", [["延甲", 2600, 320]], 200],
  ];
  for (const [d, customer, artist, paymentMethod, items, discount] of visits) {
    const { main, items: itemRows } = incomeRows(
      newId("IN"),
      {
        date: day(d),
        customer,
        artist,
        paymentMethod,
        discount,
        note: "",
        items: items.map(([service, amount, cost]) => ({ service, amount, cost })),
      },
      DEMO_USER.email,
      nowStamp(),
    );
    await appendRows(TABS.income, [main]);
    await appendRows(TABS.incomeItems, itemRows);
  }
  const stamp = nowStamp();
  await appendRows(TABS.expense, [
    [newId("EX"), day(1), "店租", 18000, "十月店租", DEMO_USER.email, stamp, stamp],
    [newId("EX"), day(2), "耗材", 2350, "凝膠補貨 12 色", DEMO_USER.email, stamp, stamp],
  ]);
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(str(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/* ------------------------------------------------------------------ reads */

export async function listIncome(): Promise<IncomeRecord[]> {
  await ready();
  const [rows, itemRows] = await readTabs([TABS.income, TABS.incomeItems]);
  return parseIncome(rows, itemRows);
}

function parseIncome(rows: Row[], itemRows: Row[]): IncomeRecord[] {
  const itemsById = new Map<string, IncomeItem[]>();
  for (const r of itemRows) {
    const list = itemsById.get(str(r[0])) ?? [];
    list.push({ service: str(r[2]), amount: num(r[3]), cost: num(r[4]) });
    itemsById.set(str(r[0]), list);
  }

  return rows
    .filter((r) => str(r[0]))
    .map((r) => ({
      kind: "income" as const,
      id: str(r[0]),
      date: str(r[1]),
      customer: str(r[2]),
      artist: str(r[12]),
      paymentMethod: str(r[3]),
      items: itemsById.get(str(r[0])) ?? [],
      amount: num(r[5]),
      cost: num(r[6]),
      discount: num(r[7]),
      note: str(r[8]),
      createdBy: str(r[9]),
      createdAt: str(r[10]),
    }));
}

export async function listExpenses(): Promise<ExpenseRecord[]> {
  await ready();
  return parseExpenses(await readRows(TABS.expense));
}

function parseExpenses(rows: Row[]): ExpenseRecord[] {
  return rows
    .filter((r) => str(r[0]))
    .map((r) => ({
      kind: "expense" as const,
      id: str(r[0]),
      date: str(r[1]),
      category: str(r[2]),
      amount: num(r[3]),
      note: str(r[4]),
      createdBy: str(r[5]),
      createdAt: str(r[6]),
    }));
}

/** Newest first: by date, then by when it was entered. */
export function sortRecords<T extends LedgerRecord>(records: T[]): T[] {
  return [...records].sort((a, b) =>
    a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
  );
}

export async function listAllRecords(): Promise<LedgerRecord[]> {
  const [income, expenses] = await Promise.all([listIncome(), listExpenses()]);
  return sortRecords<LedgerRecord>([...income, ...expenses]);
}

/**
 * Seeds in flight or done, per tab. Several views can read an empty tab at the same moment (the
 * first visit is slow because the tabs are being created); they must share one seed, or each one
 * appends the defaults again.
 */
const seeding = new Map<string, Promise<string[]>>();

export async function getPickList(list: PickList): Promise<string[]> {
  await ready();
  return pickListFrom(list, await readRows(TABS[list]));
}

/** The names in a pick-list tab, seeding the defaults the first time it is found empty. */
async function pickListFrom(list: PickList, rows: Row[]): Promise<string[]> {
  const tab = TABS[list];
  const values = rows.map((r) => str(r[0]).trim()).filter(Boolean);
  // Duplicates can still come from the sheet itself (typed by hand, or two phones seeding at once).
  if (values.length > 0) return [...new Set(values)];

  let seeded = seeding.get(tab);
  if (!seeded) {
    const defaults = DEFAULT_LISTS[tab] ?? [];
    seeded = appendRows(tab, defaults.map((name) => [name]))
      .then(() => defaults)
      .catch((error: unknown) => {
        seeding.delete(tab);
        throw error;
      });
    seeding.set(tab, seeded);
  }
  return seeded;
}

export async function getShopName(): Promise<string> {
  await ready();
  return shopNameFrom(await readRows(TABS.settings));
}

function shopNameFrom(rows: Row[]): string {
  const row = rows.find((r) => str(r[0]) === "店名");
  return str(row?.[1]) || "仙度瑞拉 Cinderella";
}

export interface LedgerSnapshot {
  income: IncomeRecord[];
  expenses: ExpenseRecord[];
  lists: Record<PickList, string[]>;
  shopName: string;
}

/** Everything the pages show, read with a single request. */
export async function loadLedgerSnapshot(): Promise<LedgerSnapshot> {
  await ready();
  const [income, items, expenses, services, paymentMethods, expenseCategories, artists, settings] = await readTabs([
    TABS.income,
    TABS.incomeItems,
    TABS.expense,
    TABS.services,
    TABS.paymentMethods,
    TABS.expenseCategories,
    TABS.artists,
    TABS.settings,
  ]);
  const lists = await Promise.all([
    pickListFrom("services", services),
    pickListFrom("paymentMethods", paymentMethods),
    pickListFrom("expenseCategories", expenseCategories),
    pickListFrom("artists", artists),
  ]);
  return {
    income: parseIncome(income, items),
    expenses: parseExpenses(expenses),
    lists: { services: lists[0], paymentMethods: lists[1], expenseCategories: lists[2], artists: lists[3] },
    shopName: shopNameFrom(settings),
  };
}

/* ----------------------------------------------------------------- writes */

export interface IncomeInput {
  date: string;
  customer: string;
  artist: string;
  paymentMethod: string;
  items: IncomeItem[];
  discount: number;
  note: string;
}

function incomeRows(id: string, input: IncomeInput, createdBy: string, createdAt: string): { main: Row; items: Row[] } {
  const amount = input.items.reduce((sum, i) => sum + i.amount, 0);
  const cost = input.items.reduce((sum, i) => sum + i.cost, 0);
  return {
    main: [
      id,
      input.date,
      input.customer,
      input.paymentMethod,
      input.items.map((i) => i.service).join("、"),
      amount,
      cost,
      input.discount,
      input.note,
      createdBy,
      createdAt,
      nowStamp(),
      input.artist,
    ],
    items: input.items.map((i) => [id, input.date, i.service, i.amount, i.cost]),
  };
}

export async function createIncome(input: IncomeInput, createdBy: string) {
  await ready();
  const id = newId("IN");
  const { main, items } = incomeRows(id, input, createdBy, nowStamp());
  await appendRows(TABS.income, [main]);
  await appendRows(TABS.incomeItems, items);
  return id;
}

export async function updateIncome(id: string, input: IncomeInput, editor: string) {
  await ready();
  const existing = (await listIncome()).find((r) => r.id === id);
  if (!existing) return false;
  const { main, items } = incomeRows(id, input, existing.createdBy || editor, existing.createdAt);
  await updateRowById(TABS.income, id, main);
  await deleteRowsById(TABS.incomeItems, id);
  await appendRows(TABS.incomeItems, items);
  return true;
}

export interface ExpenseInput {
  date: string;
  category: string;
  amount: number;
  note: string;
}

export async function createExpense(input: ExpenseInput, createdBy: string) {
  await ready();
  const id = newId("EX");
  const stamp = nowStamp();
  await appendRows(TABS.expense, [[id, input.date, input.category, input.amount, input.note, createdBy, stamp, stamp]]);
  return id;
}

export async function updateExpense(id: string, input: ExpenseInput, editor: string) {
  await ready();
  const existing = (await listExpenses()).find((r) => r.id === id);
  if (!existing) return false;
  return updateRowById(TABS.expense, id, [
    id,
    input.date,
    input.category,
    input.amount,
    input.note,
    existing.createdBy || editor,
    existing.createdAt,
    nowStamp(),
  ]);
}

export async function deleteRecord(kind: "income" | "expense", id: string) {
  await ready();
  if (kind === "income") {
    await deleteRowsById(TABS.incomeItems, id);
    return (await deleteRowsById(TABS.income, id)) > 0;
  }
  return (await deleteRowsById(TABS.expense, id)) > 0;
}

export async function addPickListItem(list: PickList, name: string) {
  const current = await getPickList(list);
  if (current.includes(name)) return;
  await appendRows(TABS[list], [[name]]);
}

export async function removePickListItem(list: PickList, name: string) {
  await ready();
  await deleteRowsById(TABS[list], name);
}

export async function setShopName(name: string) {
  await ready();
  const updated = await updateRowById(TABS.settings, "店名", ["店名", name]);
  if (!updated) await appendRows(TABS.settings, [["店名", name]]);
}

/* ---------------------------------------------------------------- reports */

export interface MonthSummary {
  revenue: number;
  serviceCost: number;
  expenses: number;
  totalCost: number;
  net: number;
  discount: number;
  visits: number;
  averageTicket: number;
  averageServiceCost: number;
}

/**
 * Net profit = what customers actually paid − recorded service costs − recorded expenses.
 * Discounts are reported for reference only; 實收金額 is already net of them, so they are
 * not subtracted again. Costs nobody recorded are not estimated.
 */
export function summarize(income: IncomeRecord[], expenses: ExpenseRecord[]): MonthSummary {
  const revenue = income.reduce((s, r) => s + r.amount, 0);
  const serviceCost = income.reduce((s, r) => s + r.cost, 0);
  const expenseTotal = expenses.reduce((s, r) => s + r.amount, 0);
  const visits = income.length;
  return {
    revenue,
    serviceCost,
    expenses: expenseTotal,
    totalCost: serviceCost + expenseTotal,
    net: revenue - serviceCost - expenseTotal,
    discount: income.reduce((s, r) => s + r.discount, 0),
    visits,
    averageTicket: visits ? revenue / visits : 0,
    averageServiceCost: visits ? serviceCost / visits : 0,
  };
}

export function inMonth<T extends { date: string }>(records: T[], month: string): T[] {
  return records.filter((r) => monthOf(r.date) === month);
}

export function serviceRanking(income: IncomeRecord[]) {
  const map = new Map<string, { service: string; count: number; amount: number }>();
  for (const record of income) {
    for (const item of record.items) {
      const entry = map.get(item.service) ?? { service: item.service, count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += item.amount;
      map.set(item.service, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount || b.count - a.count);
}

export function paymentBreakdown(income: IncomeRecord[]) {
  const map = new Map<string, { method: string; count: number; amount: number }>();
  for (const record of income) {
    const method = record.paymentMethod || "未選擇";
    const entry = map.get(method) ?? { method, count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += record.amount;
    map.set(method, entry);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

/**
 * Per-artist totals for profit sharing. 毛利 is what the artist's customers paid minus the
 * materials recorded on those visits; shop expenses are not split across artists.
 */
export function artistBreakdown(income: IncomeRecord[]) {
  const map = new Map<string, { artist: string; visits: number; amount: number; cost: number; gross: number }>();
  for (const record of income) {
    const artist = record.artist || "未指定";
    const entry = map.get(artist) ?? { artist, visits: 0, amount: 0, cost: 0, gross: 0 };
    entry.visits += 1;
    entry.amount += record.amount;
    entry.cost += record.cost;
    entry.gross = entry.amount - entry.cost;
    map.set(artist, entry);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}
