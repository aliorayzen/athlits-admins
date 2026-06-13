import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Athlits Admin",
  description: "Athlits Administration Dashboard",
};

// Render every route per-request. Required so the per-request CSP nonce set in
// `src/proxy.ts` is stamped onto Next's inline bootstrap scripts — a statically
// prerendered page can't carry a fresh nonce, and `strict-dynamic` would then
// block ALL scripts. No real cost here: every page sits behind auth and fetches
// its data client-side, so there was nothing meaningful to prerender.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
