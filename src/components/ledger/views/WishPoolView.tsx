"use client";

import { History, MessageSquareText, Sparkles } from "lucide-react";

import { LoadState } from "@/components/ledger/AppShell";
import { PageHeader } from "@/components/ledger/PageHeader";
import { WishForm } from "@/components/ledger/SettingsForms";
import { useWishes } from "@/lib/use-ledger";

export function WishPoolView() {
  const query = useWishes();
  const wishes = query.data ?? [];

  return (
    <>
      <PageHeader title="許願池" description="工作上覺得不順手的地方，都可以許個願。" />

      <div className="grid gap-4 md:gap-5">
        <section className="card flex items-center gap-4 bg-gradient-to-br from-veil to-nude-50 p-4 md:p-6">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-gold-700 shadow-sm">
            <Sparkles className="size-6" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg">讓店裡的系統越用越順手</h2>
            <p className="mt-0.5 text-sm text-ink-muted">許願內容會記在試算表的「許願池」分頁，只有店長看得到。</p>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr] md:gap-5">
          <section className="card p-4 md:p-6" aria-labelledby="wish-new">
            <h2 id="wish-new" className="mb-4 flex items-center gap-2 text-lg">
              <MessageSquareText className="size-5 text-gold-700" strokeWidth={1.75} aria-hidden="true" />
              新的願望
            </h2>
            <WishForm />
          </section>

          <section className="card p-4 md:p-6" aria-labelledby="wish-history">
            <h2 id="wish-history" className="mb-4 flex items-center gap-2 text-lg">
              <History className="size-5 text-gold-700" strokeWidth={1.75} aria-hidden="true" />
              我的許願
            </h2>
            {!query.data ? (
              <LoadState error={query.status === "error" ? query.error : undefined} onRetry={query.retry} />
            ) : wishes.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted">還沒有許願，第一個想法就從你開始。</p>
            ) : (
              <ul className="divide-y divide-line">
                {wishes.map((w) => (
                  <li key={w.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{w.title}</p>
                      <span className="shrink-0 rounded-full bg-gold-100 px-2.5 py-0.5 text-xs text-gold-700">{w.status}</span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-ink-muted">{w.description}</p>
                    <p className="mt-1 text-xs text-ink-muted/80">{w.createdAt}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
