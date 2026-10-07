"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { removeRecord } from "@/app/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-ghost min-h-9 px-2.5 text-loss hover:bg-loss-soft"
      aria-label="刪除這筆紀錄"
    >
      <Trash2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

/** Deleting removes the row from the Google Sheet, so ask first. */
export function DeleteRecordButton({ kind, id, label }: { kind: "income" | "expense"; id: string; label: string }) {
  return (
    <form
      action={removeRecord}
      onSubmit={(e) => {
        if (!window.confirm(`確定要刪除「${label}」嗎？\nGoogle Sheet 裡的這一列也會一起刪除。`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <Submit />
    </form>
  );
}
