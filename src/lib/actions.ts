/**
 * Form handlers, shaped like React's `useActionState` actions: `(prevState, formData) => state`.
 *
 * They run in the browser. Inputs are validated with zod, then written to the sheet with the
 * signed-in user's own Google token. Whatever this code checks, Google re-checks: a user the
 * sheet isn't shared with gets a 403 no matter what the page does.
 */

import { z } from "zod";

import { DEMO_MODE, DEMO_USER } from "@/lib/demo";
import { isISODate } from "@/lib/format";
import { SheetError } from "@/lib/google-sheets";
import {
  addPickListItem,
  createExpense,
  createIncome,
  deleteRecord,
  type PickList,
  removePickListItem,
  setShopName,
  updateExpense,
  updateIncome,
} from "@/lib/ledger";
import { getUser, invalidate } from "@/lib/session";

export interface ActionState {
  ok: boolean;
  message: string;
}

const money = z.coerce
  .number({ message: "請輸入數字" })
  .int("金額請輸入整數")
  .min(0, "金額不能是負數")
  .max(10_000_000, "金額太大了，請確認");

const date = z.string().refine(isISODate, "請選擇日期");
const text = (max: number) => z.string().trim().max(max, `最多 ${max} 個字`);

const incomeSchema = z.object({
  date,
  customer: text(60),
  artist: text(40),
  paymentMethod: text(40),
  discount: money,
  note: text(500),
  items: z
    .array(z.object({ service: text(60).min(1, "請選擇服務項目"), amount: money, cost: money }))
    .min(1, "至少要有一個服務項目")
    .max(20),
});

const expenseSchema = z.object({
  date,
  category: text(40).min(1, "請選擇成本類型"),
  amount: money,
  note: text(500),
});

/** Read `items.0.service` / `items.0.amount` / `items.0.cost` … into an array. */
function readItems(formData: FormData) {
  const items: Record<"service" | "amount" | "cost", FormDataEntryValue | number | null>[] = [];
  for (let i = 0; i < 20; i++) {
    if (!formData.has(`items.${i}.service`)) continue;
    items.push({
      service: formData.get(`items.${i}.service`),
      amount: formData.get(`items.${i}.amount`) || 0,
      cost: formData.get(`items.${i}.cost`) || 0,
    });
  }
  return items;
}

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "資料格式不正確";
}

function currentEmail(): string | null {
  if (DEMO_MODE) return DEMO_USER.email;
  return getUser()?.email ?? null;
}

/** Run a write; on success refresh every view, on failure explain it in plain words. */
async function guard(fn: () => Promise<unknown>, success: string): Promise<ActionState> {
  try {
    await fn();
    invalidate();
    return { ok: true, message: success };
  } catch (error) {
    console.error("[ledger]", error);
    if (error instanceof SheetError) return { ok: false, message: error.message };
    return { ok: false, message: "儲存到 Google 試算表時發生錯誤，請稍後再試。" };
  }
}

const NOT_SIGNED_IN: ActionState = { ok: false, message: "登入已失效，請重新登入。" };

export async function saveIncome(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = currentEmail();
  if (!email) return NOT_SIGNED_IN;
  const parsed = incomeSchema.safeParse({
    date: formData.get("date"),
    customer: formData.get("customer") ?? "",
    artist: formData.get("artist") ?? "",
    paymentMethod: formData.get("paymentMethod") ?? "",
    discount: formData.get("discount") || 0,
    note: formData.get("note") ?? "",
    items: readItems(formData),
  });
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const id = String(formData.get("id") ?? "");
  return guard(
    () => (id ? updateIncome(id, parsed.data, email) : createIncome(parsed.data, email)),
    id ? "收入已更新" : "收入已記錄",
  );
}

export async function saveExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = currentEmail();
  if (!email) return NOT_SIGNED_IN;
  const parsed = expenseSchema.safeParse({
    date: formData.get("date"),
    category: formData.get("category") ?? "",
    amount: formData.get("amount") || 0,
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const id = String(formData.get("id") ?? "");
  return guard(
    () => (id ? updateExpense(id, parsed.data, email) : createExpense(parsed.data, email)),
    id ? "成本已更新" : "成本已記錄",
  );
}

export async function removeRecord(kind: "income" | "expense", id: string): Promise<ActionState> {
  if (!currentEmail()) return NOT_SIGNED_IN;
  return guard(() => deleteRecord(kind, id), "已刪除");
}

const pickLists = ["services", "paymentMethods", "expenseCategories", "artists"] as const;

export async function addListItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!currentEmail()) return NOT_SIGNED_IN;
  const list = formData.get("list");
  const name = text(40).min(1, "請輸入名稱").safeParse(formData.get("name") ?? "");
  if (!pickLists.includes(list as PickList)) return { ok: false, message: "未知的清單" };
  if (!name.success) return { ok: false, message: firstIssue(name.error) };
  return guard(() => addPickListItem(list as PickList, name.data), "已新增");
}

export async function removeListItem(list: PickList, name: string): Promise<ActionState> {
  if (!currentEmail()) return NOT_SIGNED_IN;
  return guard(() => removePickListItem(list, name), "已移除");
}

export async function saveShopName(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!currentEmail()) return NOT_SIGNED_IN;
  const name = text(40).min(1, "請輸入店名").safeParse(formData.get("shopName") ?? "");
  if (!name.success) return { ok: false, message: firstIssue(name.error) };
  return guard(() => setShopName(name.data), "店名已儲存");
}
