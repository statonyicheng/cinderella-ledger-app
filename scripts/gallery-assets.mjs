// Regenerate the 作品選集 photos on the 報表 page from brand-source/gallery/.
//   node scripts/gallery-assets.mjs
//
// Sources are the salon's own photos from its Strikingly site (obedient-daffodil-z23cjs.mystrikingly.com):
//   collage.jpg       2×3 grid of hand designs (1108×1478); four tiles are cut out below
//   ink-french.jpg    nude gradient with ink French lines (1125×632)
//   tartan-gold.jpg   tartan with gold foil (1125×632)
//
// Output: public/gallery/<name>.webp — square 640px gallery tiles, plus the wide banner behind the
// 報表 page title. Crops are in source pixels; re-measure them if a source photo is replaced.
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const SRC = "brand-source/gallery";
const OUT = "public/gallery";
const SIZE = 640;

/** Tile boxes inside collage.jpg, kept clear of the white gutters between tiles. */
const PHOTOS = [
  { name: "pearl-gold", file: "collage.jpg", crop: { left: 0, top: 497, width: 551, height: 487 } },
  { name: "midnight-tweed", file: "collage.jpg", crop: { left: 558, top: 497, width: 550, height: 487 } },
  { name: "amber-marble", file: "collage.jpg", crop: { left: 0, top: 0, width: 551, height: 489 } },
  { name: "berry-tartan", file: "collage.jpg", crop: { left: 558, top: 991, width: 550, height: 487 } },
  { name: "ink-french", file: "ink-french.jpg" },
  { name: "tartan-gold", file: "tartan-gold.jpg" },
  { name: "report-banner", file: "ink-french.jpg", width: 1200, height: 520 },
];

mkdirSync(OUT, { recursive: true });
for (const photo of PHOTOS) {
  let image = sharp(`${SRC}/${photo.file}`);
  if (photo.crop) image = image.extract(photo.crop);
  await image
    .resize(photo.width ?? SIZE, photo.height ?? SIZE, { fit: "cover", position: sharp.strategy.attention })
    .webp({ quality: 78 })
    .toFile(`${OUT}/${photo.name}.webp`);
  console.log(`${OUT}/${photo.name}.webp`);
}
