"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/auth-context";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * `nonce` comes from the per-request CSP nonce minted in `src/proxy.ts`.
 * next-themes writes a pre-hydration inline script to set the theme class
 * before first paint; without the nonce, `'strict-dynamic'` blocks it and every
 * load flashes the default theme before React catches up.
 */
export function Providers({
  children,
  nonce,
}: {
  children: ReactNode;
  nonce?: string;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
    >
      <TooltipProvider>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
