import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadState } from "@/components/ledger/AppShell";
import { ReportsView } from "@/components/ledger/views/ReportsView";

export const metadata: Metadata = { title: "報表" };

export default function ReportsPage() {
  return (
    <Suspense fallback={<LoadState />}>
      <ReportsView />
    </Suspense>
  );
}
