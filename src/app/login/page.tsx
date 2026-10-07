import type { Metadata } from "next";

import { LoginView } from "@/components/ledger/views/LoginView";

export const metadata: Metadata = { title: "登入" };

export default function LoginPage() {
  return <LoginView />;
}
