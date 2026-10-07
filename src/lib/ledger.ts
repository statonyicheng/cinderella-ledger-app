import "server-only";

import {
  appendRows,
  deleteRowsById,
  ensureTabs,
  readRows,
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
 *   服務項目 / 付款方式 / 成本類型   editable pick-lists
 *   工作室設定  key/value settings
 *   許願池    staff suggestions
 */

export const TABS = {
  income: "收入",
  incomeItems: "收入明細",
  expense: "成本",
  services: "服務項目",
  paymentMethods: "付款方式",
  expenseCategories: "成本類型",
  settings: "工作室設定",
  wishes: "許願池",
} as const;

const SCHEMA: Record<string, readonly string[]> = {
  [TABS.income]: ["ID", "日期", "客戶姓名", "付款方式", "服務項目", "實收金額", "服務成本", "促銷折扣", "備註", "建立者", "建立時間", "更新時間"],
  [TABS.incomeItems]: ["收入ID", "日期", "服務項目", "實收金額", "服務成本"],
  [TABS.expense]: ["ID", "日期", "成本類型", "金額", "備註", "建立者", "建立時間", "更新時間"],
  [TABS.services]: ["名稱"],
  [TABS.paymentMethods]: ["名稱"],
  [TABS.expenseCategories]: ["名稱"],
  [TABS.settings]: ["鍵", "值"],
  [TABS.wishes]: ["ID", "項目", "說明", "提出者", "建立時間", "狀態"],
};

/** Seeded once, the first time a pick-list tab is found empty. Fully editable in 設定. */
const DEFAULT_LISTS: Record<string, string[]> = {
  [TABS.services]: ["單色凝膠", "漸層", "法式", "造型設計", "延甲", "卸甲", "保養", "飾品加購"],
  [TABS.paymentMethods]: ["現金", "轉帳", "刷卡", "LINE Pay", "其他"],
  [TABS.expenseCategories]: ["耗材", "工具設備", "店租", "水電", "行銷廣告", "教育進修", "平台手續費", "其他"],
};

export type PickList = "services" | "paymentMethods" | "expenseCategories";

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

export interface Wish {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  status: string;
}

function ready() {
  return ensureTabs(SCHEMA).then(seedDemo);
}

/** Demo mode only: a few made-up visits and expenses this month so every screen has content. */
const seeded = globalThis as unknown as { __ledgerDemoSeeded?: boolean };
async function seedDemo() {
  if (!DEMO_MODE || seeded.__ledgerDemoSeeded) return;
  seeded.__ledgerDemoSeeded = true;

  const month = todayISO().slice(0, 7);
  const day = (d: number) => `${month}-${String(Math.min(d, Number(todayISO().slice(8)))).padStart(2, "0")}`;
  const visits: [number, string, string, [string, number, number][], number][] = [
    [1, "林小姐", "LINE Pay", [["單色凝膠", 1200, 120]], 0],
    [2, "陳小姐", "現金", [["法式", 1500, 150], ["飾品加購", 300, 60]], 100],
    [3, "王小姐", "刷卡", [["造型設計", 2200, 260]], 0],
    [3, "張小姐", "轉帳", [["卸甲", 300, 20], ["漸層", 1400, 140]], 0],
    [5, "黃小姐", "LINE Pay", [["延甲", 2600, 320]], 200],
  ];
  for (const [d, customer, paymentMethod, items, discount] of visits) {
    await createIncome(
      {
        date: day(d),
        customer,
        paymentMethod,
        discount,
        note: "",
        items: items.map(([service, amount, cost]) => ({ service, amount, cost })),
      },
      DEMO_USER.email,
    );
  }
  await createExpense({ date: day(1), category: "店租", amount: 18000, note: "十月店租" }, DEMO_USER.email);
  await createExpense({ date: day(2), category: "耗材", amount: 2350, note: "凝膠補貨 12 色" }, DEMO_USER.email);
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
  const [rows, itemRows] = await Promise.all([readRows(TABS.income), readRows(TABS.incomeItems)]);

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
  const rows = await readRows(TABS.expense);
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

export async function getPickList(list: PickList): Promise<string[]> {
  await ready();
  const tab = TABS[list];
  const values = (await readRows(tab)).map((r) => str(r[0]).trim()).filter(Boolean);
  if (values.length > 0) return values;
  const defaults = DEFAULT_LISTS[tab] ?? [];
  await appendRows(tab, defaults.map((name) => [name]));
  return defaults;
}

export async function getShopName(): Promise<string> {
  await ready();
  const row = (await readRows(TABS.settings)).find((r) => str(r[0]) === "店名");
  return str(row?.[1]) || "仙度瑞拉 Cinderella";
}

export async function listWishes(email: string): Promise<Wish[]> {
  await ready();
  return (await readRows(TABS.wishes))
    .filter((r) => str(r[0]) && str(r[3]).toLowerCase() === email.toLowerCase())
    .map((r) => ({
      id: str(r[0]),
      title: str(r[1]),
      description: str(r[2]),
      createdBy: str(r[3]),
      createdAt: str(r[4]),
      status: str(r[5]) || "已收到",
    }))
    .reverse();
}

/* ----------------------------------------------------------------- writes */

export interface IncomeInput {
  date: string;
  customer: string;
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

export async function createWish(title: string, description: string, createdBy: string) {
  await ready();
  await appendRows(TABS.wishes, [[newId("WISH"), title, description, createdBy, nowStamp(), "已收到"]]);
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
