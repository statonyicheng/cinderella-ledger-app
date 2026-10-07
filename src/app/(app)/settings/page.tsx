import { Download, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/ledger/PageHeader";
import { PickListEditor, ShopNameForm } from "@/components/ledger/SettingsForms";
import { requireUser } from "@/lib/dal";
import { spreadsheetUrl } from "@/lib/google-sheets";
import { getPickList, getShopName } from "@/lib/ledger";

export const metadata: Metadata = { title: "設定" };

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

export default async function SettingsPage() {
  const user = await requireUser();
  const [shopName, services, paymentMethods, expenseCategories] = await Promise.all([
    getShopName(),
    getPickList("services"),
    getPickList("paymentMethods"),
    getPickList("expenseCategories"),
  ]);

  return (
    <>
      <PageHeader title="設定" description={`目前登入：${user.email}`} />

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
            <a href="/api/export" className="btn btn-outline">
              <Download className="size-4" strokeWidth={1.75} aria-hidden="true" />
              下載 CSV
            </a>
          </div>
        </Section>

        <Section title="服務項目" description="記收入時可選的項目。">
          <PickListEditor list="services" items={services} placeholder="新增服務項目" />
        </Section>

        <Section title="付款方式">
          <PickListEditor list="paymentMethods" items={paymentMethods} placeholder="新增付款方式" />
        </Section>

        <Section title="成本類型" description="記成本時可選的分類。">
          <PickListEditor list="expenseCategories" items={expenseCategories} placeholder="新增成本類型" />
        </Section>
      </div>
    </>
  );
}
