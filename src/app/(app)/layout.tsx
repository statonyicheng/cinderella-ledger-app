import { LogOut } from "lucide-react";

import { BrandMark } from "@/components/ledger/BrandMark";
import { MainNav } from "@/components/ledger/MainNav";
import { requireUser } from "@/lib/dal";

/** Shell for every signed-in page. `requireUser` is the real gate; proxy.ts only pre-filters. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-6 md:pt-8 md:pb-12">
      <header className="mb-5 flex items-center justify-between gap-3 md:mb-6">
        <BrandMark />
        <div className="flex items-center gap-2">
          <span className="hidden max-w-48 truncate text-sm text-ink-muted sm:block" title={user.email}>
            {user.name}
          </span>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="btn btn-outline min-h-10 px-3.5 text-sm">
              <LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" />
              登出
            </button>
          </form>
        </div>
      </header>

      <MainNav />

      <main id="main">{children}</main>
    </div>
  );
}
