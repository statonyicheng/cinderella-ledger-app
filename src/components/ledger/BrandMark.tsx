import Image from "next/image";

import { asset } from "@/config";
import { cn } from "@/lib/utils";

/**
 * Header brand: the official crest (crown, shield and flourish, extracted from the CIS logo as
 * ink on transparent — see README "品牌素材") beside the 仙度瑞拉 / Cinderella wordmark set in type.
 * The wordmark is typeset rather than taken from the artwork because the logo's lettering
 * becomes unreadable at header size.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src={asset("/brand/crest.png")}
        alt=""
        width={420}
        height={336}
        priority
        className="h-11 w-auto shrink-0 md:h-12"
      />
      <span className="grid leading-tight">
        <span className="font-serif text-lg font-semibold tracking-[0.18em] text-ink">仙度瑞拉</span>
        <span className="font-script text-sm text-gold-700 italic">
          Cinderella{" "}
          <span className="text-[0.7em] tracking-[0.2em] text-ink-muted uppercase not-italic">Beauty Salon</span>
        </span>
      </span>
    </div>
  );
}
