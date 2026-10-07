"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { removeRecord } from "@/lib/actions";

/** Deleting removes the row from the Google Sheet, so ask first. */
export function DeleteRecordButton({ kind, id, label }: { kind: "income" | "expense"; id: string; label: string }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        if (!window.confirm(`確定要刪除「${label}」嗎？\nGoogle 試算表裡的這一列也會一起刪除。`)) return;
        setPending(true);
        const result = await removeRecord(kind, id);
        setPending(false);
        if (!result.ok) window.alert(result.message);
      }}
      className="btn btn-ghost min-h-9 px-2.5 text-loss hover:bg-loss-soft"
      aria-label="刪除這筆紀錄"
    >
      <Trash2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
