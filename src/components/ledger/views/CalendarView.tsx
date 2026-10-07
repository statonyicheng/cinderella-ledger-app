"use client";

import { useSearchParams } from "next/navigation";

import { LoadState } from "@/components/ledger/AppShell";
import { type DayTotals, MonthCalendar } from "@/components/ledger/MonthCalendar";
import { PageHeader } from "@/components/ledger/PageHeader";
import { RecordComposer } from "@/components/ledger/RecordComposer";
import { RecordList } from "@/components/ledger/RecordList";
import { SummaryCards } from "@/components/ledger/SummaryCards";
import { formatDateLabel, formatNTD, isISODate, isISOMonth, monthOf, todayISO } from "@/lib/format";
import { inMonth, sortRecords, summarize } from "@/lib/ledger";
import { useLedger } from "@/lib/use-ledger";

export function CalendarView() {
  const params = useSearchParams();
  const ledger = useLedger();

  const today = todayISO();
  const dateParam = params.get("date") ?? "";
  const monthParam = params.get("month") ?? "";
  const selected = isISODate(dateParam) ? dateParam : today;
  const month = isISOMonth(monthParam) ? monthParam : monthOf(selected);

  if (!ledger.data) return <LoadState error={ledger.status === "error" ? ledger.error : undefined} onRetry={ledger.retry} />;
  const { income, expenses, lists } = ledger.data;

  const summary = summarize(inMonth(income, month), inMonth(expenses, month));

  const totals = new Map<string, DayTotals>();
  const bump = (date: string, field: keyof DayTotals, value: number) => {
    const t = totals.get(date) ?? { income: 0, cost: 0 };
    t[field] += value;
    totals.set(date, t);
  };
  for (const r of income) {
    bump(r.date, "income", r.amount);
    if (r.cost) bump(r.date, "cost", r.cost);
  }
  for (const r of expenses) bump(r.date, "cost", r.amount);

  const dayRecords = sortRecords([
    ...income.filter((r) => r.date === selected),
    ...expenses.filter((r) => r.date === selected),
  ]);
  const day = totals.get(selected) ?? { income: 0, cost: 0 };

  return (
    <>
      <PageHeader
        title="記帳月曆"
        description="點日期看當天明細；營收、成本、淨利依已記錄的資料即時計算。"
        action={<RecordComposer lists={lists} defaultDate={selected} />}
      />

      {ledger.status === "error" ? (
        <p role="alert" className="mb-4 rounded-xl bg-loss-soft px-4 py-3 text-sm text-loss">
          {ledger.error}
        </p>
      ) : null}

      <div className="grid gap-4 md:gap-5">
        <SummaryCards summary={summary} />

        <MonthCalendar month={month} selected={selected} today={today} totals={totals} />

        <section className="card p-4 md:p-6" aria-labelledby="day-title">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="day-title" className="text-lg">
              {formatDateLabel(selected)}
            </h2>
            <p className="tabular text-sm text-ink-muted">
              收入 <span className="text-profit">{formatNTD(day.income)}</span>
              <span className="mx-2 text-line-strong">|</span>
              成本 <span className="text-loss">{formatNTD(day.cost)}</span>
              <span className="mx-2 text-line-strong">|</span>
              淨利 <span className="font-semibold text-ink">{formatNTD(day.income - day.cost)}</span>
            </p>
          </div>
          <div className="gold-rule mb-1" />
          <RecordList
            records={dayRecords}
            lists={lists}
            showDate={false}
            empty="這天還沒有紀錄。按右上角「記一筆」新增收入或成本。"
          />
        </section>
      </div>
    </>
  );
}
