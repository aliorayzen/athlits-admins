import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Breadcrumb-style back link shared by the chooser and both creation flows.
 * Intentionally has no "use client" directive: it is purely a styled <Link>,
 * so it can render on the server (keeping the chooser page free of client JS).
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-1)] px-2.5 py-[5px] pl-2 text-[12px] font-medium text-[var(--text-3)] transition-all hover:-translate-x-px hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
    >
      <ArrowLeft className="h-[13px] w-[13px]" />
      {label}
    </Link>
  );
}
