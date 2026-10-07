"use client";

import { useSearchParams } from "next/navigation";

import { LoadState } from "@/components/ledger/AppShell";
import { PageHeader } from "@/components/ledger/PageHeader";
import { SummaryCards } from "@/components/ledger/SummaryCards";
import { formatMonthLabel, formatNTD, isISOMonth, monthOf, todayISO } from "@/lib/format";
import { artistBreakdown, inMonth, paymentBreakdown, serviceRanking, summarize } from "@/lib/ledger";
import { useLedger } from "@/lib/use-ledger";

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-marble-deep" aria-hidden="true">
      <div className="h-full rounded-full bg-gradient-to-r from-nude-300 to-gold-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ReportsView() {
  const params = useSearchParams();
  const ledger = useLedger();
  const raw = params.get("month") ?? "";
  const month = isISOMonth(raw) ? raw : monthOf(todayISO());

  if (!ledger.data) return <LoadState error={ledger.status === "error" ? ledger.error : undefined} onRetry={ledger.retry} />;
  const { income: allIncome, expenses: allExpenses } = ledger.data;
  const income = inMonth(allIncome, month);
  const expenses = inMonth(allExpenses, month);
  const s = summarize(income, expenses);
  const ranking = serviceRanking(income);
  const payments = paymentBreakdown(income);
  const artists = artistBreakdown(income);
  const expenseByCategory = [...expenses.reduce((m, r) => m.set(r.category, (m.get(r.category) ?? 0) + r.amount), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1]);

  const stats = [
    { label: "服務人次", value: `${s.visits} 位` },
    { label: "平均客單", value: formatNTD(s.averageTicket) },
    { label: "平均耗材成本", value: formatNTD(s.averageServiceCost) },
    { label: "折扣總額", value: formatNTD(s.discount) },
    { label: "服務耗材", value: formatNTD(s.serviceCost) },
    { label: "營運支出", value: formatNTD(s.expenses) },
  ];

  return (
    <>
      <PageHeader
        title={`${formatMonthLabel(month)}報表`}
        description="淨利 = 實收 − 服務耗材 − 營運支出。沒記錄的成本不會被估算進來。"
        action={
          <form method="get" className="flex items-center gap-2">
            <label className="sr-only" htmlFor="month">
              報表月份
            </label>
            <input id="month" type="month" name="month" defaultValue={month} className="field min-h-10 w-40" />
            <button type="submit" className="btn btn-outline min-h-10 px-4">
              查看
            </button>
          </form>
        }
      />

      <div className="grid gap-4 md:gap-5">
        <SummaryCards summary={s} />

        <section className="card grid grid-cols-2 gap-px overflow-hidden bg-line p-0 md:grid-cols-3" aria-label="營運指標">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-veil px-4 py-4 md:px-6">
              <p className="text-xs text-ink-muted">{stat.label}</p>
              <p className="tabular mt-1 font-serif text-lg font-semibold text-ink">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="card p-4 md:p-6" aria-labelledby="artist-title">
          <h2 id="artist-title" className="text-lg">
            美甲師業績
          </h2>
          <p className="mt-0.5 mb-4 text-xs text-ink-muted">分潤參考：毛利 = 實收 − 該美甲師服務的耗材成本，不含店租等營運支出。</p>
          {artists.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">本月還沒有收入紀錄。</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 md:gap-x-8">
              {artists.map((a) => (
                <li key={a.artist} className="grid gap-2">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">
                      {a.artist}
                      <span className="ml-1.5 text-xs font-normal text-ink-muted">{a.visits} 位客人</span>
                    </span>
                    <span className="tabular font-medium">{formatNTD(a.amount)}</span>
                  </div>
                  <Bar value={a.amount} max={artists[0].amount} />
                  <dl className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-ink-muted">實收</dt>
                      <dd className="tabular">{formatNTD(a.amount)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">耗材成本</dt>
                      <dd className="tabular">{formatNTD(a.cost)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">毛利</dt>
                      <dd className="tabular font-medium">{formatNTD(a.gross)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          <section className="card p-4 md:p-6" aria-labelledby="rank-title">
            <h2 id="rank-title" className="mb-3 text-lg">
              熱門服務
            </h2>
            {ranking.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">本月還沒有收入紀錄。</p>
            ) : (
              <ol className="grid gap-3.5">
                {ranking.map((r, i) => (
                  <li key={r.service} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span>
                        <span className="tabular mr-2 font-script text-base text-gold-700 italic">{i + 1}</span>
                        {r.service}
                        <span className="ml-1.5 text-xs text-ink-muted">{r.count} 次</span>
                      </span>
                      <span className="tabular font-medium">{formatNTD(r.amount)}</span>
                    </div>
                    <Bar value={r.amount} max={ranking[0].amount} />
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="card p-4 md:p-6" aria-labelledby="pay-title">
            <h2 id="pay-title" className="mb-3 text-lg">
              付款方式
            </h2>
            {payments.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">本月還沒有付款資料。</p>
            ) : (
              <ul className="grid gap-3.5">
                {payments.map((p) => (
                  <li key={p.method} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span>
                        {p.method}
                        <span className="ml-1.5 text-xs text-ink-muted">{p.count} 筆</span>
                      </span>
                      <span className="tabular font-medium">{formatNTD(p.amount)}</span>
                    </div>
                    <Bar value={p.amount} max={payments[0].amount} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="card p-4 md:p-6" aria-labelledby="exp-title">
          <h2 id="exp-title" className="mb-3 text-lg">
            營運支出分類
          </h2>
          {expenseByCategory.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">本月還沒有成本紀錄。</p>
          ) : (
            <ul className="grid gap-3.5 md:grid-cols-2 md:gap-x-8">
              {expenseByCategory.map(([category, amount]) => (
                <li key={category} className="grid gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{category}</span>
                    <span className="tabular font-medium text-loss">{formatNTD(amount)}</span>
                  </div>
                  <Bar value={amount} max={expenseByCategory[0][1]} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
