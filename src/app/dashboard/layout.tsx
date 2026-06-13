"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-0)]">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-10 w-10 rounded-xl" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-0)]">
      <Sidebar />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="relative flex-1 overflow-y-auto">
          {/* Ambient background effects */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="animate-drift absolute -top-32 right-1/4 h-64 w-80 rounded-full bg-[rgba(0,212,170,0.02)] blur-[120px]" />
            <div className="animate-drift-reverse absolute bottom-0 left-1/3 h-48 w-64 rounded-full bg-[rgba(0,212,170,0.015)] blur-[100px]" />
            {/* Subtle grid */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,212,170,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.012) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
          </div>
          <div className="animate-page-in relative z-10 p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
