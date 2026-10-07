import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { formatNTD } from "@/lib/format";
import type { MonthSummary } from "@/lib/ledger";
import { cn } from "@/lib/utils";

/** Revenue / cost / net for a month, as three quiet cards. */
export function SummaryCards({ summary }: { summary: MonthSummary }) {
  const cards = [
    { label: "營收", value: summary.revenue, icon: Wallet, tone: "text-ink", chip: "bg-gold-100 text-gold-700" },
    { label: "成本", value: summary.totalCost, icon: TrendingDown, tone: "text-loss", chip: "bg-loss-soft text-loss" },
    {
      label: "淨利",
      value: summary.net,
      icon: TrendingUp,
      tone: summary.net < 0 ? "text-loss" : "text-profit",
      chip: summary.net < 0 ? "bg-loss-soft text-loss" : "bg-profit-soft text-profit",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5 md:gap-4">
      {cards.map(({ label, value, icon: Icon, tone, chip }) => (
        <div key={label} className="card @container flex flex-col gap-2 px-2.5 py-3 md:flex-row md:items-center md:gap-4 md:p-5">
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl md:size-12 md:rounded-2xl", chip)}>
            <Icon className="size-4 md:size-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-ink-muted md:text-sm">本月{label}</p>
            {/*
              Phones: three cards share the width (~110px each at 375px, ~92px at 320px), so the
              figure scales with its own card (container query units) and "−NT$12,345" always fits.
            */}
            <p
              className={cn(
                "tabular truncate font-serif text-[length:clamp(11px,15.5cqi,16px)] font-semibold md:text-2xl",
                tone,
              )}
            >
              {formatNTD(value)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
