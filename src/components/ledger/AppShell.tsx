"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { BrandMark } from "@/components/ledger/BrandMark";
import { MainNav } from "@/components/ledger/MainNav";
import { DEMO_MODE } from "@/lib/demo";
import { signOut } from "@/lib/google-auth";
import { useSessionUser } from "@/lib/use-ledger";

/**
 * Shell for every signed-in page. With no server, the sign-in check happens here in the
 * browser — which is fine, because it only decides what to *show*. What a user can actually
 * read or change is enforced by Google on the spreadsheet itself.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useSessionUser();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  if (!user) {
    return <div className="grid min-h-dvh place-items-center text-sm text-ink-muted">正在確認登入狀態…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-6 md:pt-8 md:pb-12">
      <header className="mb-5 flex items-center justify-between gap-3 md:mb-6">
        <BrandMark />
        <div className="flex items-center gap-2">
          <span className="hidden max-w-48 truncate text-sm text-ink-muted sm:block" title={user.email}>
            {user.name}
          </span>
          {DEMO_MODE ? null : (
            <button
              type="button"
              onClick={() => {
                signOut();
                router.replace("/login");
              }}
              className="btn btn-outline min-h-10 px-3.5 text-sm"
            >
              <LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" />
              登出
            </button>
          )}
        </div>
      </header>

      <MainNav />

      <main id="main">{children}</main>
    </div>
  );
}

/** Loading / error placeholder shared by every view. */
export function LoadState({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  if (!error) {
    return (
      <div className="grid gap-4" aria-busy="true" aria-live="polite">
        <span className="sr-only">正在讀取帳本…</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-28 animate-pulse bg-marble-deep/50" />
        ))}
      </div>
    );
  }
  return (
    <div role="alert" className="card mx-auto max-w-lg p-6 text-center">
      <h2 className="text-xl">暫時讀不到帳本</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{error}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn btn-primary mt-5">
          再試一次
        </button>
      ) : null}
    </div>
  );
}
