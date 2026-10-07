import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadState } from "@/components/ledger/AppShell";
import { RecordsView } from "@/components/ledger/views/RecordsView";

export const metadata: Metadata = { title: "紀錄" };

export default function RecordsPage() {
  return (
    <Suspense fallback={<LoadState />}>
      <RecordsView />
    </Suspense>
  );
}
