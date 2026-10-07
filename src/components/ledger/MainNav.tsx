"use client";

import { CalendarDays, ChartPie, ReceiptText, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "月曆", icon: CalendarDays },
  { href: "/records", label: "紀錄", icon: ReceiptText },
  { href: "/reports", label: "報表", icon: ChartPie },
  { href: "/wish-pool", label: "許願池", icon: Sparkles },
  { href: "/settings", label: "設定", icon: Settings },
] as const;

/**
 * Desktop: an inline segmented control under the header.
 * Mobile: a tab bar pinned to the bottom edge, clear of the home indicator.
 */
export function MainNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      aria-label="主要功能"
      className={cn(
        "z-30",
        // mobile tab bar
        "fixed inset-x-0 bottom-0 border-t border-line bg-veil/95 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-md",
        // desktop segmented control
        "md:static md:mx-auto md:mb-6 md:w-fit md:rounded-full md:border md:p-1.5 md:shadow-[var(--shadow-card)]",
      )}
    >
      <ul className="grid grid-cols-5 gap-1 md:flex">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-medium transition-colors",
                  "md:flex-row md:gap-2 md:rounded-full md:px-5 md:py-2.5 md:text-sm",
                  active ? "bg-ink text-gold-100" : "text-ink-muted hover:bg-marble-deep hover:text-ink",
                )}
              >
                <Icon className="size-5 md:size-4" strokeWidth={1.75} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
