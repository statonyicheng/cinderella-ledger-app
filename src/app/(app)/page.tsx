import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadState } from "@/components/ledger/AppShell";
import { CalendarView } from "@/components/ledger/views/CalendarView";

export const metadata: Metadata = { title: "月曆" };

// useSearchParams in a statically exported page must sit inside a Suspense boundary.
export default function CalendarPage() {
  return (
    <Suspense fallback={<LoadState />}>
      <CalendarView />
    </Suspense>
  );
}
