import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { calendarDays, formatMonthLabel, monthOf, shiftMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface DayTotals {
  income: number;
  cost: number;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const compact = new Intl.NumberFormat("zh-TW", { notation: "compact", maximumFractionDigits: 1 });

/**
 * Month grid. Each day links to itself (`?month=…&date=…`) so the selection survives a
 * refresh and works without JavaScript.
 */
export function MonthCalendar({
  month,
  selected,
  today,
  totals,
}: {
  month: string;
  selected: string;
  today: string;
  totals: Map<string, DayTotals>;
}) {
  const days = calendarDays(month);
  const href = (m: string, d?: string) => `/?month=${m}${d ? `&date=${d}` : ""}`;

  return (
    <section className="card p-3 md:p-5" aria-label={formatMonthLabel(month)}>
      <div className="mb-3 flex items-center justify-between">
        <Link href={href(shiftMonth(month, -1))} className="btn btn-ghost min-h-10 px-3" aria-label="上個月">
          <ChevronLeft className="size-5" strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <div className="text-center">
          <h2 className="text-xl">{formatMonthLabel(month)}</h2>
          {month !== monthOf(today) ? (
            <Link href={href(monthOf(today), today)} className="text-xs text-gold-700 underline-offset-2 hover:underline">
              回到本月
            </Link>
          ) : null}
        </div>
        <Link href={href(shiftMonth(month, 1))} className="btn btn-ghost min-h-10 px-3" aria-label="下個月">
          <ChevronRight className="size-5" strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>

      <div className="gold-rule mb-2" />

      <div className="grid grid-cols-7 text-center text-xs text-ink-muted" aria-hidden="true">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={cn("py-1.5", (i === 0 || i === 6) && "text-nude-700")}>
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-1.5">
        {days.map((day) => {
          const inMonth = monthOf(day) === month;
          const t = totals.get(day);
          const isSelected = day === selected;
          const isToday = day === today;
          return (
            <Link
              key={day}
              href={href(month, day)}
              aria-current={isSelected ? "date" : undefined}
              aria-label={`${day}${t ? `，收入 ${t.income} 元，成本 ${t.cost} 元` : ""}`}
              className={cn(
                "flex min-h-14 flex-col rounded-xl border p-1 text-left transition-colors md:min-h-20 md:p-2",
                isSelected
                  ? "border-ink bg-ink text-gold-100"
                  : "border-transparent hover:border-line-strong hover:bg-veil",
                !inMonth && !isSelected && "opacity-35",
              )}
            >
              <span
                className={cn(
                  "tabular grid size-6 place-items-center rounded-full text-xs font-semibold md:text-sm",
                  isToday && !isSelected && "bg-gold-300/50 text-ink",
                )}
              >
                {Number(day.slice(8))}
              </span>
              {t ? (
                <span className="mt-auto grid gap-px text-[10px] leading-tight md:text-xs">
                  {t.income > 0 ? (
                    <span className={cn("tabular truncate", isSelected ? "text-gold-100" : "text-profit")}>
                      +{compact.format(t.income)}
                    </span>
                  ) : null}
                  {t.cost > 0 ? (
                    <span className={cn("tabular truncate", isSelected ? "text-nude-300" : "text-loss")}>
                      −{compact.format(t.cost)}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
