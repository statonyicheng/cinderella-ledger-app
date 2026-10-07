import { CreditCard, Scissors } from "lucide-react";

import { DeleteRecordButton } from "@/components/ledger/DeleteRecordButton";
import { type PickLists, RecordComposer } from "@/components/ledger/RecordComposer";
import { formatDateLabel, formatNTD } from "@/lib/format";
import type { LedgerRecord } from "@/lib/ledger";
import { cn } from "@/lib/utils";

/** Income and expense rows in one list, each editable and deletable in place. */
export function RecordList({
  records,
  lists,
  showDate = true,
  empty,
}: {
  records: LedgerRecord[];
  lists: PickLists;
  showDate?: boolean;
  empty: string;
}) {
  if (records.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-muted">{empty}</p>;
  }

  return (
    <ul className="divide-y divide-line">
      {records.map((record) => {
        const income = record.kind === "income";
        const title = income
          ? record.items.map((i) => i.service).join("、") || "收入"
          : record.category;
        const sub = income
          ? [record.customer, record.paymentMethod].filter(Boolean).join(" · ")
          : record.note;

        return (
          <li key={`${record.kind}-${record.id}`} className="flex items-center gap-3 py-3">
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-2xl",
                income ? "bg-nude-100 text-nude-700" : "bg-marble-deep text-ink-soft",
              )}
              aria-hidden="true"
            >
              {income ? <Scissors className="size-4" strokeWidth={1.75} /> : <CreditCard className="size-4" strokeWidth={1.75} />}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{title}</p>
              <p className="truncate text-xs text-ink-muted">
                {showDate ? formatDateLabel(record.date) : null}
                {showDate && sub ? " · " : null}
                {sub}
              </p>
            </div>

            <div className="text-right">
              <p className={cn("tabular font-serif font-semibold", income ? "text-ink" : "text-loss")}>
                {income ? "" : "−"}
                {formatNTD(record.amount)}
              </p>
              {income && record.cost > 0 ? (
                <p className="tabular text-xs text-ink-muted">耗材 {formatNTD(record.cost)}</p>
              ) : null}
            </div>

            <div className="flex shrink-0">
              <RecordComposer lists={lists} defaultDate={record.date} editing={record} />
              <DeleteRecordButton kind={record.kind} id={record.id} label={title} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
