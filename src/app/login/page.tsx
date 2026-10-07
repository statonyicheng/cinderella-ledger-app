import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/ledger/BrandMark";
import { getSessionUser } from "@/lib/dal";

export const metadata: Metadata = { title: "登入" };

const ERRORS: Record<string, string> = {
  not_allowed: "這個 Google 帳號沒有使用權限。請聯絡店長把你的 Gmail 加入名單。",
  cancelled: "已取消 Google 登入。",
  state: "登入逾時或連結失效，請再試一次。",
  google: "Google 登入暫時失敗，請稍後再試。",
};

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getSessionUser()) redirect("/");
  const { error } = await searchParams;
  const message = error ? ERRORS[error] : undefined;

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="card w-full max-w-sm px-6 py-10 text-center md:px-8">
        <BrandMark size="lg" className="justify-center" />
        <div className="gold-rule mx-auto my-7 w-3/4" />
        <h1 className="text-xl">店內記帳</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          每一筆收入與成本都會即時寫進店裡的 Google 試算表，月底直接對帳。
        </p>

        {message ? (
          <p role="alert" className="mt-5 rounded-xl bg-loss-soft px-4 py-3 text-sm text-loss">
            {message}
          </p>
        ) : null}

        {/* A plain link: the route handler starts the Google OAuth redirect. */}
        <a href="/api/auth/login" className="btn btn-outline mt-7 w-full gap-3 bg-white">
          <GoogleLogo />
          使用 Google 帳號登入
        </a>
        <p className="mt-4 text-xs text-ink-muted">僅限店內授權的 Gmail 帳號</p>
      </div>
    </main>
  );
}
