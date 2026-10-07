import { Download, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/ledger/PageHeader";
import { RecordComposer } from "@/components/ledger/RecordComposer";
import { RecordList } from "@/components/ledger/RecordList";
import { requireUser } from "@/lib/dal";
import { formatNTD, isISODate, todayISO } from "@/lib/format";
import { getPickList, type LedgerRecord, listAllRecords } from "@/lib/ledger";

export const metadata: Metadata = { title: "紀錄" };

type Filters = { type?: string; q?: string; from?: string; to?: string };

function matches(record: LedgerRecord, f: Required<Filters>) {
  if (f.type === "income" && record.kind !== "income") return false;
  if (f.type === "expense" && record.kind !== "expense") return false;
  if (f.from && record.date < f.from) return false;
  if (f.to && record.date > f.to) return false;
  if (f.q) {
    const haystack =
      record.kind === "income"
        ? [record.customer, record.paymentMethod, record.note, ...record.items.map((i) => i.service)]
        : [record.category, record.note];
    if (!haystack.join(" ").toLowerCase().includes(f.q.toLowerCase())) return false;
  }
  return true;
}

export default async function RecordsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  await requireUser();
  const p = await searchParams;
  const filters = {
    type: p.type === "income" || p.type === "expense" ? p.type : "",
    q: (p.q ?? "").trim().slice(0, 60),
    from: p.from && isISODate(p.from) ? p.from : "",
    to: p.to && isISODate(p.to) ? p.to : "",
  };

  const [records, services, paymentMethods, expenseCategories] = await Promise.all([
    listAllRecords(),
    getPickList("services"),
    getPickList("paymentMethods"),
    getPickList("expenseCategories"),
  ]);
  const lists = { services, paymentMethods, expenseCategories };
  const shown = records.filter((r) => matches(r, filters));
  const incomeTotal = shown.reduce((s, r) => s + (r.kind === "income" ? r.amount : 0), 0);
  const costTotal = shown.reduce((s, r) => s + (r.kind === "income" ? r.cost : r.amount), 0);
  const filtered = Boolean(filters.type || filters.q || filters.from || filters.to);

  const exportQuery = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <>
      <PageHeader
        title="全部紀錄"
        description="搜尋、篩選、修改每一筆收入與成本。"
        action={<RecordComposer lists={lists} defaultDate={todayISO()} />}
      />

      <form method="get" className="card mb-4 grid gap-3 p-4 md:grid-cols-[8rem_1fr_9.5rem_9.5rem_auto] md:items-end md:p-5">
        <label className="block">
          <span className="label">類型</span>
          <select name="type" defaultValue={filters.type} className="field">
            <option value="">全部</option>
            <option value="income">收入</option>
            <option value="expense">成本</option>
          </select>
        </label>
        <label className="block">
          <span className="label">關鍵字</span>
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="客人、服務項目、備註…"
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">從</span>
          <input type="date" name="from" defaultValue={filters.from} className="field" />
        </label>
        <label className="block">
          <span className="label">到</span>
          <input type="date" name="to" defaultValue={filters.to} className="field" />
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary flex-1 md:flex-none">
            <Search className="size-4" strokeWidth={1.75} aria-hidden="true" />
            篩選
          </button>
          {filtered ? (
            <Link href="/records" className="btn btn-ghost">
              清除
            </Link>
          ) : null}
        </div>
      </form>

      <section className="card p-4 md:p-6" aria-labelledby="list-title">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 id="list-title" className="text-lg">
            {filtered ? "篩選結果" : "所有紀錄"}
            <span className="ml-2 font-sans text-sm font-normal text-ink-muted">共 {shown.length} 筆</span>
          </h2>
          <div className="flex items-center gap-3">
            <p className="tabular text-sm text-ink-muted">
              收入 <span className="text-profit">{formatNTD(incomeTotal)}</span> · 成本{" "}
              <span className="text-loss">{formatNTD(costTotal)}</span>
            </p>
            <a href={`/api/export${exportQuery ? `?${exportQuery}` : ""}`} className="btn btn-outline min-h-9 px-3 text-sm">
              <Download className="size-4" strokeWidth={1.75} aria-hidden="true" />
              CSV
            </a>
          </div>
        </div>
        <div className="gold-rule mb-1" />
        <RecordList
          records={shown}
          lists={lists}
          empty={filtered ? "沒有符合條件的紀錄。" : "還沒有任何紀錄。按「記一筆」開始。"}
        />
      </section>
    </>
  );
}
