import type { Metadata } from "next";

import { SettingsView } from "@/components/ledger/views/SettingsView";

export const metadata: Metadata = { title: "設定" };

export default function SettingsPage() {
  return <SettingsView />;
}
