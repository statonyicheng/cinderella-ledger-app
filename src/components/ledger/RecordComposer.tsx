"use client";

import { Minus, Pencil, Plus, X } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { type ActionState, saveExpense, saveIncome } from "@/app/actions";
import type { ExpenseRecord, IncomeItem, IncomeRecord } from "@/lib/ledger";
import { cn } from "@/lib/utils";

export interface PickLists {
  services: string[];
  paymentMethods: string[];
  expenseCategories: string[];
}

type Kind = "income" | "expense";

const IDLE: ActionState = { ok: false, message: "" };

/**
 * "記一筆" — one dialog for adding or editing either an income or an expense.
 * When `editing` is passed the kind is fixed and the form is pre-filled.
 */
export function RecordComposer({
  lists,
  defaultDate,
  editing,
}: {
  lists: PickLists;
  defaultDate: string;
  editing?: IncomeRecord | ExpenseRecord;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<Kind>(editing?.kind ?? "income");
  // 0 = never opened: the forms aren't rendered at all, so a list of hundreds of records
  // doesn't ship hundreds of hidden forms. Bumping it remounts the forms with fresh values.
  const [formKey, setFormKey] = useState(0);
  const titleId = useId();

  const open = () => {
    setFormKey((k) => k + 1);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      {editing ? (
        <button type="button" onClick={open} className="btn btn-ghost min-h-9 px-2.5" aria-label="編輯這筆紀錄">
          <Pencil className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      ) : (
        <button type="button" onClick={open} className="btn btn-primary">
          <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
          記一筆
        </button>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(100vw-1.5rem,34rem)] max-h-[min(100dvh-1.5rem,52rem)] overflow-y-auto rounded-[var(--radius-card)] border border-line bg-veil p-0 text-ink shadow-[var(--shadow-float)] backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
        onClick={(e) => {
          if (e.target === dialogRef.current) close(); // click on the backdrop
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-veil/95 px-5 py-4 backdrop-blur">
          <h2 id={titleId} className="text-lg">
            {editing ? "編輯紀錄" : "記一筆"}
          </h2>
          <button type="button" onClick={close} className="btn btn-ghost min-h-9 px-2.5" aria-label="關閉">
            <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 pt-4 pb-5">
          {!editing ? (
            <div role="tablist" aria-label="紀錄類型" className="mb-5 grid grid-cols-2 rounded-full bg-marble-deep p-1">
              {(["income", "expense"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={kind === k}
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-full py-2 text-sm font-semibold transition-colors",
                    kind === k ? "bg-veil text-ink shadow-sm" : "text-ink-muted",
                  )}
                >
                  {k === "income" ? "收入" : "成本"}
                </button>
              ))}
            </div>
          ) : null}

          {formKey === 0 ? null : kind === "income" ? (
            <IncomeForm
              key={`income-${formKey}`}
              lists={lists}
              defaultDate={defaultDate}
              record={editing?.kind === "income" ? editing : undefined}
              onDone={close}
            />
          ) : (
            <ExpenseForm
              key={`expense-${formKey}`}
              lists={lists}
              defaultDate={defaultDate}
              record={editing?.kind === "expense" ? editing : undefined}
              onDone={close}
            />
          )}
        </div>
      </dialog>
    </>
  );
}

function useCloseOnSuccess(state: ActionState, onDone: () => void) {
  const handled = useRef(state);
  useEffect(() => {
    if (state !== handled.current && state.ok) onDone();
    handled.current = state;
  }, [state, onDone]);
}

function FormFooter({ pending, state, label }: { pending: boolean; state: ActionState; label: string }) {
  return (
    <div className="mt-2 grid gap-3">
      <p
        role="status"
        aria-live="polite"
        className={cn("min-h-5 text-sm", state.ok ? "text-profit" : "text-loss")}
      >
        {state.message}
      </p>
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "儲存中…" : label}
      </button>
    </div>
  );
}

function Options({ values, current }: { values: string[]; current?: string }) {
  // Keep a value that was later removed from the pick-list so editing doesn't silently change it.
  const all = current && !values.includes(current) ? [current, ...values] : values;
  return all.map((v) => (
    <option key={v} value={v}>
      {v}
    </option>
  ));
}

function IncomeForm({
  lists,
  defaultDate,
  record,
  onDone,
}: {
  lists: PickLists;
  defaultDate: string;
  record?: IncomeRecord;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(saveIncome, IDLE);
  useCloseOnSuccess(state, onDone);

  // Stable row keys: initial rows use their index; rows added later take the next counter
  // value inside the click handler (never during render).
  const nextKey = useRef(100);
  const [items, setItems] = useState<(IncomeItem & { key: number })[]>(() =>
    record?.items.length
      ? record.items.map((i, index) => ({ ...i, key: index }))
      : [{ key: 0, service: "", amount: 0, cost: 0 }],
  );
  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  return (
    <form action={action} className="grid gap-4">
      {record ? <input type="hidden" name="id" value={record.id} /> : null}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">日期</span>
          <input type="date" name="date" required defaultValue={record?.date ?? defaultDate} className="field" />
        </label>
        <label className="block">
          <span className="label">付款方式</span>
          <select name="paymentMethod" defaultValue={record?.paymentMethod ?? ""} className="field">
            <option value="">未選擇</option>
            <Options values={lists.paymentMethods} current={record?.paymentMethod} />
          </select>
        </label>
      </div>

      <label className="block">
        <span className="label">客人</span>
        <input
          name="customer"
          maxLength={60}
          defaultValue={record?.customer}
          placeholder="姓名或暱稱（可留空）"
          className="field"
          autoComplete="off"
        />
      </label>

      <fieldset className="grid gap-2.5 rounded-2xl border border-line bg-marble/60 p-3">
        <legend className="label px-1">服務項目</legend>
        <div className="grid grid-cols-[1fr_5.5rem_5.5rem_2.25rem] gap-2 px-1 text-xs text-ink-muted">
          <span>項目</span>
          <span>實收</span>
          <span>耗材成本</span>
          <span />
        </div>
        {items.map((item, index) => (
          <div key={item.key} className="grid grid-cols-[1fr_5.5rem_5.5rem_2.25rem] items-center gap-2">
            <select
              name={`items.${index}.service`}
              required
              defaultValue={item.service}
              aria-label={`第 ${index + 1} 項服務`}
              className="field min-h-11 px-2.5"
            >
              <option value="" disabled>
                請選擇
              </option>
              <Options values={lists.services} current={item.service} />
            </select>
            <input
              type="number"
              inputMode="numeric"
              name={`items.${index}.amount`}
              min={0}
              step={1}
              required
              defaultValue={item.amount || ""}
              onChange={(e) =>
                setItems((all) => all.map((it) => (it.key === item.key ? { ...it, amount: Number(e.target.value) } : it)))
              }
              aria-label={`第 ${index + 1} 項實收金額`}
              className="field tabular min-h-11 px-2.5"
            />
            <input
              type="number"
              inputMode="numeric"
              name={`items.${index}.cost`}
              min={0}
              step={1}
              defaultValue={item.cost || ""}
              aria-label={`第 ${index + 1} 項耗材成本`}
              className="field tabular min-h-11 px-2.5"
            />
            <button
              type="button"
              disabled={items.length === 1}
              onClick={() => setItems((all) => all.filter((it) => it.key !== item.key))}
              className="btn btn-ghost min-h-9 px-0"
              aria-label={`移除第 ${index + 1} 項`}
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        <div className="flex items-center justify-between px-1 pt-1">
          <button
            type="button"
            disabled={items.length >= 20}
            onClick={() => {
              const key = nextKey.current++;
              setItems((all) => [...all, { key, service: "", amount: 0, cost: 0 }]);
            }}
            className="btn btn-ghost min-h-9 px-2 text-sm text-gold-700"
          >
            <Plus className="size-4" aria-hidden="true" />
            加一項
          </button>
          <span className="tabular text-sm text-ink-soft">
            合計實收 <strong className="font-serif text-base text-ink">NT${total.toLocaleString("zh-TW")}</strong>
          </span>
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">折扣金額</span>
          <input
            type="number"
            inputMode="numeric"
            name="discount"
            min={0}
            step={1}
            defaultValue={record?.discount || ""}
            placeholder="0"
            className="field tabular"
          />
        </label>
        <p className="self-end pb-2 text-xs leading-relaxed text-ink-muted">
          折扣只做統計，實收金額已經是折扣後的數字。
        </p>
      </div>

      <label className="block">
        <span className="label">備註</span>
        <textarea name="note" rows={2} maxLength={500} defaultValue={record?.note} className="field resize-y" />
      </label>

      <FormFooter pending={pending} state={state} label={record ? "更新收入" : "記下這筆收入"} />
    </form>
  );
}

function ExpenseForm({
  lists,
  defaultDate,
  record,
  onDone,
}: {
  lists: PickLists;
  defaultDate: string;
  record?: ExpenseRecord;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(saveExpense, IDLE);
  useCloseOnSuccess(state, onDone);

  return (
    <form action={action} className="grid gap-4">
      {record ? <input type="hidden" name="id" value={record.id} /> : null}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">日期</span>
          <input type="date" name="date" required defaultValue={record?.date ?? defaultDate} className="field" />
        </label>
        <label className="block">
          <span className="label">金額</span>
          <input
            type="number"
            inputMode="numeric"
            name="amount"
            min={0}
            step={1}
            required
            defaultValue={record?.amount || ""}
            className="field tabular"
          />
        </label>
      </div>

      <label className="block">
        <span className="label">成本類型</span>
        <select name="category" required defaultValue={record?.category ?? ""} className="field">
          <option value="" disabled>
            請選擇
          </option>
          <Options values={lists.expenseCategories} current={record?.category} />
        </select>
      </label>

      <label className="block">
        <span className="label">備註</span>
        <textarea
          name="note"
          rows={2}
          maxLength={500}
          defaultValue={record?.note}
          placeholder="例如：凝膠補貨 12 色"
          className="field resize-y"
        />
      </label>

      <FormFooter pending={pending} state={state} label={record ? "更新成本" : "記下這筆成本"} />
    </form>
  );
}
