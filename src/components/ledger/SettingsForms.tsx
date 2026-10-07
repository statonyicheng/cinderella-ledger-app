"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { type ActionState, addListItem, removeListItem, saveShopName, submitWish } from "@/app/actions";
import { cn } from "@/lib/utils";

const IDLE: ActionState = { ok: false, message: "" };

function Status({ state }: { state: ActionState }) {
  return (
    <p role="status" aria-live="polite" className={cn("min-h-5 text-sm", state.ok ? "text-profit" : "text-loss")}>
      {state.message}
    </p>
  );
}

/** Reset the form after a successful submit so the next entry starts clean. */
function useResetOnSuccess(state: ActionState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function ShopNameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(saveShopName, IDLE);
  return (
    <form action={action} className="grid gap-2">
      <label className="block">
        <span className="label">店名</span>
        <div className="flex gap-2">
          <input name="shopName" required maxLength={40} defaultValue={current} className="field" />
          <button type="submit" disabled={pending} className="btn btn-primary shrink-0">
            {pending ? "儲存中…" : "儲存"}
          </button>
        </div>
      </label>
      <Status state={state} />
    </form>
  );
}

function RemoveChip({ list, name }: { list: string; name: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="grid size-6 place-items-center rounded-full text-ink-muted hover:bg-loss-soft hover:text-loss"
      aria-label={`移除 ${name}`}
      data-list={list}
    >
      <X className="size-3.5" aria-hidden="true" />
    </button>
  );
}

/** An editable pick-list (services / payment methods / expense categories) as removable chips. */
export function PickListEditor({ list, items, placeholder }: { list: string; items: string[]; placeholder: string }) {
  const [state, action, pending] = useActionState(addListItem, IDLE);
  const formRef = useResetOnSuccess(state);

  return (
    <div className="grid gap-3">
      <ul className="flex flex-wrap gap-2">
        {items.map((name) => (
          <li key={name} className="flex items-center gap-1 rounded-full border border-line bg-veil py-1 pr-1 pl-3.5 text-sm">
            {name}
            <form
              action={removeListItem}
              onSubmit={(e) => {
                if (!window.confirm(`移除「${name}」？\n舊紀錄不受影響，只是之後不會出現在選單裡。`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="list" value={list} />
              <input type="hidden" name="name" value={name} />
              <RemoveChip list={list} name={name} />
            </form>
          </li>
        ))}
      </ul>
      <form ref={formRef} action={action} className="flex gap-2">
        <input type="hidden" name="list" value={list} />
        <input name="name" required maxLength={40} placeholder={placeholder} className="field min-h-10" aria-label={placeholder} />
        <button type="submit" disabled={pending} className="btn btn-outline min-h-10 shrink-0 px-4">
          <Plus className="size-4" aria-hidden="true" />
          新增
        </button>
      </form>
      <Status state={state} />
    </div>
  );
}

export function WishForm() {
  const [state, action, pending] = useActionState(submitWish, IDLE);
  const formRef = useResetOnSuccess(state);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <label className="block">
        <span className="label">想要的功能或改善</span>
        <input name="title" required maxLength={120} placeholder="例如：每週自動寄營收摘要到 LINE" className="field" />
      </label>
      <label className="block">
        <span className="label">說明</span>
        <textarea
          name="description"
          required
          maxLength={2000}
          rows={4}
          placeholder="在什麼情況下會用到？它能幫你省下什麼麻煩？"
          className="field resize-y"
        />
      </label>
      <p className="text-xs text-ink-muted">請不要填寫密碼、信用卡號等敏感資料。</p>
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "送出中…" : "送出許願"}
      </button>
    </form>
  );
}
