"use client";

import { Download, ExternalLink } from "lucide-react";

import { LoadState } from "@/components/ledger/AppShell";
import { PageHeader } from "@/components/ledger/PageHeader";
import { PickListEditor, ShopNameForm } from "@/components/ledger/SettingsForms";
import { spreadsheetUrl } from "@/config";
import { downloadCsv } from "@/lib/csv";
import { todayISO } from "@/lib/format";
import { type LedgerRecord, sortRecords } from "@/lib/ledger";
import { useLedger, useSessionUser } from "@/lib/use-ledger";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4 md:p-6">
      <h2 className="text-lg">{title}</h2>
      {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      <div className="gold-rule my-4" />
      {children}
    </section>
  );
}

export function SettingsView() {
  const user = useSessionUser();
  const ledger = useLedger();

  if (!ledger.data) return <LoadState error={ledger.status === "error" ? ledger.error : undefined} onRetry={ledger.retry} />;
  const { shopName, lists, income, expenses } = ledger.data;

  return (
    <>
      <PageHeader title="設定" description={user ? `目前登入：${user.email}` : undefined} />

      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        <Section title="店家資料">
          <ShopNameForm current={shopName} />
        </Section>

        <Section title="帳本與備份" description="所有資料都即時存在這份 Google 試算表，可直接在裡面對帳。">
          <div className="flex flex-wrap gap-2">
            <a href={spreadsheetUrl()} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden="true" />
              開啟 Google 試算表
            </a>
            <button
              type="button"
              onClick={() =>
                downloadCsv(sortRecords<LedgerRecord>([...income, ...expenses]), `cinderella-ledger-${todayISO()}.csv`)
              }
              className="btn btn-outline"
            >
              <Download className="size-4" strokeWidth={1.75} aria-hidden="true" />
              下載 CSV
            </button>
          </div>
        </Section>

        <Section title="服務項目" description="記收入時可選的項目。">
          <PickListEditor list="services" items={lists.services} placeholder="新增服務項目" />
        </Section>

        <Section title="付款方式">
          <PickListEditor list="paymentMethods" items={lists.paymentMethods} placeholder="新增付款方式" />
        </Section>

        <Section title="成本類型" description="記成本時可選的分類。">
          <PickListEditor list="expenseCategories" items={lists.expenseCategories} placeholder="新增成本類型" />
        </Section>
      </div>
    </>
  );
}
