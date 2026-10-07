import { cn } from "@/lib/utils";

/**
 * Typographic brand mark. Stands in until the official crest artwork is dropped into
 * `public/brand/` — see README "品牌素材". Deliberately simple so it never competes with
 * the real logo once that is wired in.
 */
export function BrandMark({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  const large = size === "lg";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "grid shrink-0 place-items-center rounded-full border border-gold-300 bg-veil font-script italic text-ink shadow-[inset_0_0_0_3px_var(--color-veil),inset_0_0_0_4px_var(--color-gold-100)]",
          large ? "size-20 text-5xl" : "size-11 text-2xl",
        )}
      >
        C
      </span>
      <span className="grid leading-tight">
        <span className={cn("font-serif font-semibold tracking-[0.18em] text-ink", large ? "text-3xl" : "text-lg")}>
          仙度瑞拉
        </span>
        <span className={cn("font-script italic text-gold-700", large ? "text-xl" : "text-sm")}>
          Cinderella <span className="not-italic text-[0.7em] tracking-[0.2em] text-ink-muted uppercase">Beauty Salon</span>
        </span>
      </span>
    </div>
  );
}
