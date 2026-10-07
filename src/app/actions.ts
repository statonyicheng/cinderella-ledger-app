"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/dal";
import { isISODate } from "@/lib/format";
import {
  addPickListItem,
  createExpense,
  createIncome,
  createWish,
  deleteRecord,
  type PickList,
  removePickListItem,
  setShopName,
  updateExpense,
  updateIncome,
} from "@/lib/ledger";

/**
 * Every action re-checks the session through the DAL before touching the sheet — server
 * actions are public HTTP endpoints, so the page-level check alone is not enough.
 */

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

function refreshLedger() {
  for (const path of ["/", "/records", "/reports"]) revalidatePath(path);
}

async function guard<T>(fn: () => Promise<T>, success: string): Promise<ActionState> {
  try {
    await fn();
    return { ok: true, message: success };
  } catch (error) {
    console.error("[ledger]", error);
    return { ok: false, message: "儲存到 Google Sheet 時發生錯誤，請稍後再試。" };
  }
}

export async function saveIncome(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = incomeSchema.safeParse({
    date: formData.get("date"),
    customer: formData.get("customer") ?? "",
    paymentMethod: formData.get("paymentMethod") ?? "",
    discount: formData.get("discount") || 0,
    note: formData.get("note") ?? "",
    items: readItems(formData),
  });
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const id = String(formData.get("id") ?? "");
  const result = await guard(async () => {
    if (id) await updateIncome(id, parsed.data, user.email);
    else await createIncome(parsed.data, user.email);
  }, id ? "收入已更新" : "收入已記錄");
  if (result.ok) refreshLedger();
  return result;
}

export async function saveExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = expenseSchema.safeParse({
    date: formData.get("date"),
    category: formData.get("category") ?? "",
    amount: formData.get("amount") || 0,
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const id = String(formData.get("id") ?? "");
  const result = await guard(async () => {
    if (id) await updateExpense(id, parsed.data, user.email);
    else await createExpense(parsed.data, user.email);
  }, id ? "成本已更新" : "成本已記錄");
  if (result.ok) refreshLedger();
  return result;
}

export async function removeRecord(formData: FormData) {
  await requireUser();
  const kind = formData.get("kind");
  const id = String(formData.get("id") ?? "");
  if ((kind !== "income" && kind !== "expense") || !id) return;
  await deleteRecord(kind, id);
  refreshLedger();
}

const pickLists = ["services", "paymentMethods", "expenseCategories"] as const;

export async function addListItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const list = formData.get("list");
  const name = text(40).min(1, "請輸入名稱").safeParse(formData.get("name") ?? "");
  if (!pickLists.includes(list as PickList)) return { ok: false, message: "未知的清單" };
  if (!name.success) return { ok: false, message: firstIssue(name.error) };
  const result = await guard(() => addPickListItem(list as PickList, name.data), "已新增");
  if (result.ok) revalidatePath("/settings");
  return result;
}

export async function removeListItem(formData: FormData) {
  await requireUser();
  const list = formData.get("list");
  const name = String(formData.get("name") ?? "");
  if (!pickLists.includes(list as PickList) || !name) return;
  await removePickListItem(list as PickList, name);
  revalidatePath("/settings");
}

export async function saveShopName(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const name = text(40).min(1, "請輸入店名").safeParse(formData.get("shopName") ?? "");
  if (!name.success) return { ok: false, message: firstIssue(name.error) };
  const result = await guard(() => setShopName(name.data), "店名已儲存");
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function submitWish(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = z
    .object({ title: text(120).min(1, "請填寫想要的功能"), description: text(2000).min(1, "請補充說明") })
    .safeParse({ title: formData.get("title") ?? "", description: formData.get("description") ?? "" });
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const result = await guard(
    () => createWish(parsed.data.title, parsed.data.description, user.email),
    "收到你的許願了，謝謝！",
  );
  if (result.ok) revalidatePath("/wish-pool");
  return result;
}
