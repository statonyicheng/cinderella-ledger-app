// Regenerate every web brand asset from the two source files in brand-source/.
//   node scripts/brand-assets.mjs
//
//   brand-source/logo.jpg   1080×1080 CIS logo: ink crest + wordmark on a round plate over marble
//   brand-source/nails.jpg  signature nail photo
//
// Outputs:
//   public/brand/crest.png        crest only, ink on transparent (header)
//   public/brand/logo-plate.webp  full logo cut to its round plate (sign-in page)
//   public/brand/nails.webp       the photo, web-compressed (sign-in page)
//   src/app/icon.png, apple-icon.png   crest on a plate-coloured disc (favicon / home screen)
//
// If the logo artwork changes, re-measure PLATE and CREST below against the new file.
import sharp from "sharp";

const SRC = "brand-source";
const INK = [0x2b, 0x23, 0x20]; // --color-ink
const PLATE_RGB = [0xf3, 0xee, 0xea];

/** The round plate inside logo.jpg, measured from where marble turns to plate on the centre lines. */
const PLATE = { cx: 538, cy: 540, r: 486 };
/** Crown + shield + flourish, without the lettering. */
const CREST = { left: 190, top: 90, width: 700, height: 560 };

/** Dark line work → opaque ink; the light plate → transparent. */
async function inkOnly(input, width) {
  const { data, info } = await sharp(input).resize(width).greyscale().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const alpha = Math.max(0, Math.min(1, (195 - data[i]) / (195 - 70)));
    rgba.set([...INK, Math.round(alpha * 255)], i * 4);
  }
  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } });
}

/** Anti-aliased disc, either a flat colour or masking an RGB source of the same size. */
function disc(size, { rgb, source }) {
  const r = size / 2;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      const colour = source ? [source[p * 3], source[p * 3 + 1], source[p * 3 + 2]] : rgb;
      const alpha = Math.max(0, Math.min(1, r - Math.hypot(x + 0.5 - r, y + 0.5 - r)));
      buf.set([...colour, Math.round(alpha * 255)], p * 4);
    }
  }
  return sharp(buf, { raw: { width: size, height: size, channels: 4 } });
}

// 1. Crest: crop, then paint everything outside the plate white so the marble can't read as ink.
const crop = await sharp(`${SRC}/logo.jpg`).extract(CREST).greyscale().raw().toBuffer({ resolveWithObject: true });
const inset = PLATE.r - 6;
for (let y = 0; y < crop.info.height; y++) {
  for (let x = 0; x < crop.info.width; x++) {
    if (Math.hypot(x + CREST.left - PLATE.cx, y + CREST.top - PLATE.cy) > inset) crop.data[y * crop.info.width + x] = 255;
  }
}
const crest = await sharp(crop.data, { raw: { width: crop.info.width, height: crop.info.height, channels: 1 } }).png().toBuffer();
await (await inkOnly(crest, 420)).png({ compressionLevel: 9 }).toFile("public/brand/crest.png");

// 2. Full logo on its plate (2px inside the edge so no marble fringe shows).
const side = (PLATE.r - 2) * 2;
const plate = await sharp(`${SRC}/logo.jpg`)
  .extract({ left: PLATE.cx - side / 2, top: PLATE.cy - side / 2, width: side, height: side })
  .resize(640)
  .removeAlpha()
  .raw()
  .toBuffer();
await disc(640, { source: plate }).webp({ quality: 88, alphaQuality: 90 }).toFile("public/brand/logo-plate.webp");

// 3. Photo.
await sharp(`${SRC}/nails.jpg`).webp({ quality: 80 }).toFile("public/brand/nails.webp");

// 4. App icons.
for (const [file, size] of [["src/app/icon.png", 512], ["src/app/apple-icon.png", 180]]) {
  const mark = await (await inkOnly(crest, Math.round(size * 0.78))).png().toBuffer();
  const { width, height } = await sharp(mark).metadata();
  const background = await disc(size, { rgb: PLATE_RGB }).png().toBuffer();
  await sharp(background)
    .composite([{ input: mark, left: Math.round((size - width) / 2), top: Math.round((size - height) / 2) }])
    .png()
    .toFile(file);
}

console.log("Brand assets written.");
