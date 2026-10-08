import Image from "next/image";

import { asset } from "@/config";

/** The salon's own work, cut from its official site by scripts/gallery-assets.mjs. */
const WORKS = [
  { src: "/gallery/pearl-gold.webp", title: "金箔珍珠", alt: "透膚杏仁甲綴金箔與珍珠" },
  { src: "/gallery/midnight-tweed.webp", title: "午夜毛呢", alt: "深藍、毛呢紋與銀灰閃粉，點綴金色飾品" },
  { src: "/gallery/amber-marble.webp", title: "琥珀暈染", alt: "裸色杏仁甲搭配琥珀金暈染" },
  { src: "/gallery/ink-french.webp", title: "墨線法式", alt: "裸粉漸層搭配墨色線條法式" },
  { src: "/gallery/berry-tartan.webp", title: "莓果格紋", alt: "酒紅、粉色閃粉與格紋" },
  { src: "/gallery/tartan-gold.webp", title: "蘇格蘭金箔", alt: "紅黑格紋綴金箔與珍珠" },
] as const;

const INSTAGRAM = "https://www.instagram.com/nailscinderellatw/";

/** A quiet close to the report page: a few of the salon's designs and a way to see more. */
export function AtelierGallery() {
  return (
    <section aria-labelledby="atelier-title" className="pt-6 pb-2 md:pt-10">
      <div className="text-center">
        <p className="font-script text-lg text-gold-700 italic">From Our Atelier</p>
        <h2 id="atelier-title" className="mt-1 text-lg tracking-[0.25em]">
          作品選集
        </h2>
        <div className="gold-rule mx-auto mt-4 w-24" />
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
        {WORKS.map((work) => (
          <li key={work.src}>
            <figure className="group">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-linear-to-br from-nude-100 to-marble-deep shadow-[var(--shadow-card)]">
                <Image
                  src={asset(work.src)}
                  alt={work.alt}
                  fill
                  sizes="(min-width: 768px) 300px, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
              </div>
              <figcaption className="mt-2 text-center font-serif text-sm tracking-[0.15em] text-ink-soft">
                {work.title}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-center">
        <a
          href={INSTAGRAM}
          target="_blank"
          rel="noreferrer"
          className="font-script text-base text-gold-700 italic underline-offset-4 hover:underline"
        >
          more on Instagram @nailscinderellatw
        </a>
      </p>
    </section>
  );
}
