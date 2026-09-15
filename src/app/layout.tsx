import type { Metadata } from "next";
import { headers } from "next/headers";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Set by src/proxy.ts; forwarded to next-themes so its pre-hydration
  // script satisfies the strict-dynamic CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
