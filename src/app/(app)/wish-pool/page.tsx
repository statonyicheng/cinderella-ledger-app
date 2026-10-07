import type { Metadata } from "next";

import { WishPoolView } from "@/components/ledger/views/WishPoolView";

export const metadata: Metadata = { title: "許願池" };

export default function WishPoolPage() {
  return <WishPoolView />;
}
