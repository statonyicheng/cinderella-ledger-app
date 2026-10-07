"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { asset, isAllowed } from "@/config";
import { preloadGoogleSignIn, signIn, SignInError } from "@/lib/google-auth";
import { useSessionUser } from "@/lib/use-ledger";

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

/**
 * Phone: the signature nail photo as a banner with the sign-in card lifted over its lower edge.
 * Desktop: photo and card side by side as one panel.
 */
export function LoginView() {
  const router = useRouter();
  const user = useSessionUser();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  useEffect(preloadGoogleSignIn, []);

  async function handleSignIn() {
    setPending(true);
    setMessage(null);
    try {
      await signIn(isAllowed);
      router.replace("/");
    } catch (error) {
      if (error instanceof SignInError && error.code === "cancelled") setMessage("已取消 Google 登入。");
      else setMessage(error instanceof Error ? error.message : "Google 登入失敗，請稍後再試。");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-dvh md:grid md:place-items-center md:p-8">
      {/* `.card` is a component class, which Tailwind v4 variants can't prefix, so the desktop panel
          spells out the same surface with utilities. */}
      <div className="md:grid md:w-full md:max-w-4xl md:grid-cols-[1fr_1.05fr] md:overflow-hidden md:rounded-[var(--radius-card)] md:border md:border-line md:bg-veil/90 md:shadow-[var(--shadow-card)]">
        {/* Phones: the photo itself fades out (mask), revealing the real page background underneath. */}
        <div className="relative h-[42dvh] min-h-64 overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)] md:h-auto md:min-h-[36rem] md:[mask-image:none]">
          <Image
            src={asset("/brand/nails.webp")}
            alt="仙度瑞拉的裸粉金箔杏仁形指甲作品"
            fill
            priority
            sizes="(min-width: 768px) 440px, 100vw"
            className="object-cover object-[50%_40%]"
          />
        </div>

        <div className="relative -mt-16 px-4 pb-10 md:mt-0 md:grid md:place-items-center md:px-10 md:py-12">
          <div className="card px-6 pt-8 pb-8 text-center md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
            <Image
              src={asset("/brand/logo-plate.webp")}
              alt="仙度瑞拉 Cinderella Beauty Salon"
              width={640}
              height={640}
              priority
              className="mx-auto size-36 drop-shadow-[0_8px_20px_rgb(43_35_32/0.12)] md:size-44"
            />
            <div className="gold-rule mx-auto my-6 w-2/3" />
            <h1 className="text-xl">店內記帳</h1>
            <p className="mx-auto mt-2 max-w-72 text-sm leading-relaxed text-ink-muted">
              每一筆收入與成本都會即時寫進店裡的 Google 試算表，月底直接對帳。
            </p>

            {message ? (
              <p role="alert" className="mt-5 rounded-xl bg-loss-soft px-4 py-3 text-sm text-loss">
                {message}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleSignIn}
              disabled={pending}
              className="btn btn-outline mt-7 w-full max-w-80 gap-3 bg-white"
            >
              <GoogleLogo />
              {pending ? "正在開啟 Google…" : "使用 Google 帳號登入"}
            </button>
            <p className="mt-4 text-xs text-ink-muted">僅限店內授權的 Gmail 帳號</p>
          </div>
        </div>
      </div>
    </main>
  );
}
