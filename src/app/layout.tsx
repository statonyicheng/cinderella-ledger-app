import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";

import "./globals.css";

// CJK fonts are served in unicode-range slices; preloading them would fetch every slice.
const notoSans = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
});

const notoSerif = Noto_Serif_TC({
  variable: "--font-noto-serif-tc",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["500", "600"],
  style: ["italic", "normal"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "仙度瑞拉記帳", template: "%s｜仙度瑞拉記帳" },
  description: "仙度瑞拉 Cinderella Beauty Salon 內部記帳系統",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f6f2ee",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant" className={`${notoSans.variable} ${notoSerif.variable} ${cormorant.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
