import type { CSSProperties } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type Accent = "amber" | "teal" | "blue";

const ACCENT_VARS: Record<Accent, Record<string, string>> = {
  amber: {
    "--accent": "var(--semantic-amber)",
    "--accent-dark": "var(--amber-deep)",
    "--accent-subtle": "rgb(var(--amber-rgb)/0.1)",
    "--accent-ring": "rgb(var(--amber-rgb)/0.3)",
    "--accent-on": "#231405",
    "--accent-glow": "rgb(var(--amber-rgb)/0.4)",
  },
  teal: {
    "--accent": "var(--teal)",
    "--accent-dark": "var(--teal-deep)",
    "--accent-subtle": "rgb(var(--teal-rgb)/0.1)",
    "--accent-ring": "rgb(var(--teal-rgb)/0.3)",
    "--accent-on": "var(--on-teal)",
    "--accent-glow": "rgb(var(--teal-rgb)/0.35)",
  },
  blue: {
    "--accent": "#6366f1",
    "--accent-dark": "#4f46e5",
    "--accent-subtle": "rgb(var(--indigo-rgb)/0.1)",
    "--accent-ring": "rgb(var(--indigo-rgb)/0.3)",
    "--accent-on": "#f5f6ff",
    "--accent-glow": "rgb(var(--indigo-rgb)/0.4)",
  },
};

export interface DirectoryUnavailableProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  body: string;
  accent?: Accent;
  /** Optional primary action (e.g. "Create admin"). */
  action?: { href: string; label: string };
}

/** Honest empty state for a user directory that has no backing list endpoint.
 *  Shows the page header and a centered panel — no fabricated data. */
export function DirectoryUnavailable({
  title,
  subtitle,
  icon: Icon,
  body,
  accent = "teal",
  action,
}: DirectoryUnavailableProps) {
  const accentStyle = ACCENT_VARS[accent] as unknown as CSSProperties;

  return (
    <div className="users-v2 space-y-5" style={accentStyle}>
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
          {title}
        </h1>
        <p className="text-[13px] tracking-[-0.003em] text-[var(--text-3)]">
          {subtitle}
        </p>
      </div>

      <div className="flex flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] py-16">
        <div className="relative mb-5">
          <div className="absolute -inset-3 rounded-3xl bg-[var(--accent-subtle)] blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] ring-1 ring-[var(--accent-ring)]">
            <Icon className="h-7 w-7 text-[var(--accent)]" />
          </div>
        </div>
        <p className="text-base font-medium text-[var(--text-1)]">
          Directory not available yet
        </p>
        <p className="mt-1.5 max-w-md text-center text-sm text-[var(--text-3)]">
          {body}
        </p>
        {action && (
          <Link href={action.href} className="mt-5">
            <Button
              style={{
                background:
                  "linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)",
              }}
              className="gap-1.5 border border-[var(--accent-ring)] px-6 font-semibold text-[var(--accent-on)] shadow-[0_0_24px_-4px_var(--accent-glow)] transition-transform hover:-translate-y-px"
            >
              {action.label}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
