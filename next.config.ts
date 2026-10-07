import type { NextConfig } from "next";

/**
 * Static export for GitHub Pages: `npm run build` writes plain HTML/CSS/JS to `out/`.
 *
 * GitHub Pages serves a project site under /<repo>, so the deploy workflow sets
 * NEXT_PUBLIC_BASE_PATH=/cinderella-ledger-app. Locally it is empty and the site lives at /.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // The image optimizer is a server feature; Pages serves images as-is (they are pre-sized).
  images: { unoptimized: true },
  // /records/ → records/index.html, which is how GitHub Pages resolves directory URLs.
  trailingSlash: true,
};

export default nextConfig;
