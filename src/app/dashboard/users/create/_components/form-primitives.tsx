"use client";

import { useId } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared primitives for the two user-creation flows (Admin + Venue Manager).
 *
 * Both pages share the same form chrome (numbered sections, labelled inputs,
 * a sticky preview card, and a footer with ⌘/Ctrl+Enter submit). The only
 * meaningful difference is the accent color, so it is threaded through as a
 * prop instead of duplicating each primitive per role.
 */
export type Accent = "teal" | "amber";

interface AccentClasses {
  /** Numbered step badge box (border + bg + text). */
  badge: string;
  /** Step label + section accent text. */
  text: string;
  /** Input focus ring/border. */
  inputFocus: string;
}

const ACCENT: Record<Accent, AccentClasses> = {
  teal: {
    badge:
      "border-[rgba(0,212,170,0.14)] bg-[var(--teal-subtle)] text-[var(--teal-text)]",
    text: "text-[var(--teal-text)]",
    inputFocus:
      "focus:border-[var(--teal)] focus:shadow-[0_0_0_3px_var(--teal-subtle)]",
  },
  amber: {
    badge:
      "border-[rgba(245,158,11,0.14)] bg-[rgba(245,158,11,0.1)] text-[var(--semantic-amber)]",
    text: "text-[var(--semantic-amber)]",
    inputFocus:
      "focus:border-[var(--semantic-amber)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]",
  },
};

const SUBMIT_ACCENT: Record<Accent, string> = {
  teal: "border-[rgba(0,212,170,0.3)] bg-[linear-gradient(135deg,#00d4aa_0%,#00b894_100%)] text-[#032921] shadow-[0_0_20px_-6px_rgba(0,212,170,0.35)] hover:-translate-y-px hover:bg-[linear-gradient(135deg,#1be2ba_0%,#0cc89f_100%)] hover:shadow-[0_0_28px_-6px_rgba(0,212,170,0.5)]",
  amber:
    "border-[rgba(245,158,11,0.3)] bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] text-[#1a1100] shadow-[0_0_20px_-6px_rgba(245,158,11,0.35)] hover:-translate-y-px hover:bg-[linear-gradient(135deg,#fbbf24_0%,#ea8c06_100%)] hover:shadow-[0_0_28px_-6px_rgba(245,158,11,0.5)]",
};

const PREVIEW_AVATAR: Record<Accent, string> = {
  teal: "border-[rgba(0,212,170,0.22)] bg-[linear-gradient(135deg,rgba(0,212,170,0.28),rgba(0,212,170,0.08))] text-[var(--teal-text)]",
  amber:
    "border-[rgba(245,158,11,0.22)] bg-[linear-gradient(135deg,rgba(245,158,11,0.28),rgba(245,158,11,0.08))] text-[var(--semantic-amber)]",
};

const PREVIEW_BADGE: Record<Accent, string> = {
  teal: "border-[rgba(0,212,170,0.14)] bg-[rgba(0,212,170,0.1)] text-[var(--teal-text)]",
  amber:
    "border-[rgba(245,158,11,0.14)] bg-[rgba(245,158,11,0.1)] text-[var(--semantic-amber)]",
};

/* ── Form sections + fields ──────────────────────────────────── */

export function FormSection({
  step,
  label,
  title,
  desc,
  accent,
  children,
}: {
  step: number;
  label: string;
  title: string;
  desc: string;
  accent: Accent;
  children: React.ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <div className="border-b border-[var(--border)] px-6 py-6 last:border-b-0">
      <div className="mb-3.5">
        <div className="mb-1 inline-flex items-center gap-2">
          <span
            className={cn(
              "grid h-[18px] w-[18px] place-items-center rounded-full border font-mono text-[10px] font-semibold",
              a.badge,
            )}
          >
            {step}
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.08em]",
              a.text,
            )}
          >
            {label}
          </span>
        </div>
        <h2 className="mb-[2px] text-[15px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-1)]">
          {title}
        </h2>
        <p className="text-[12.5px] leading-[1.5] text-[var(--text-3)]">
          {desc}
        </p>
      </div>
      {children}
    </div>
  );
}

export interface FieldHint {
  tone: "info" | "amber";
  icon: LucideIcon;
  text: string;
}

export function TextField({
  label,
  required,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  accent = "teal",
  hint,
}: {
  label: string;
  required?: boolean;
  icon: LucideIcon;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  accent?: Accent;
  hint?: FieldHint;
}) {
  const HintIcon = hint?.icon;
  const inputId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]"
      >
        <span>
          {label}
          {required && (
            <span className="ml-1.5 text-[var(--semantic-red)] opacity-85">
              *
            </span>
          )}
        </span>
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-[11px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[var(--text-4)] transition-colors" />
        <input
          id={inputId}
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-[38px] w-full rounded-md border border-[var(--border)] bg-[var(--bg-0)] pl-[34px] pr-3 text-[13.5px] text-[var(--text-1)] outline-none transition-all placeholder:text-[var(--text-4)]",
            ACCENT[accent].inputFocus,
          )}
        />
      </div>
      {hint && HintIcon && (
        <div
          className={cn(
            "mt-0.5 flex items-start gap-1.5 text-[11px] leading-[1.4]",
            hint.tone === "info"
              ? "text-[var(--semantic-blue)]"
              : "text-[var(--semantic-amber)]",
          )}
        >
          <HintIcon className="mt-0.5 h-[11px] w-[11px] flex-shrink-0" />
          <span>{hint.text}</span>
        </div>
      )}
    </div>
  );
}

export function StrengthMeter({ strength }: { strength: 0 | 1 | 2 | 3 | 4 }) {
  const toneAt = (i: number): string => {
    if (i >= strength) return "bg-white/[0.05]";
    if (strength <= 2) return "bg-[var(--semantic-amber)]";
    return "bg-[var(--semantic-green)]";
  };
  return (
    <div className="mt-1.5 grid grid-cols-4 gap-1">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn("h-[3px] rounded-sm transition-colors", toneAt(i))}
        />
      ))}
    </div>
  );
}

/* ── Footer ──────────────────────────────────────────────────── */

export function FormFooter({
  accent,
  submitting,
  canSubmit,
  submitLabel,
  submitIcon: SubmitIcon,
  cancelHref,
}: {
  accent: Accent;
  submitting: boolean;
  canSubmit: boolean;
  submitLabel: string;
  submitIcon: LucideIcon;
  cancelHref: string;
}) {
  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] bg-white/[0.008] px-6 py-4">
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-4)]">
        <kbd className="inline-flex items-center rounded border border-[var(--border-strong)] bg-[var(--bg-2)] px-1.5 py-[1.5px] font-mono text-[10px] leading-none text-[var(--text-3)]">
          ⌘
        </kbd>
        <kbd className="inline-flex items-center rounded border border-[var(--border-strong)] bg-[var(--bg-2)] px-1.5 py-[1.5px] font-mono text-[10px] leading-none text-[var(--text-3)]">
          ↵
        </kbd>
        <span>to create user</span>
      </div>
      <div className="flex gap-2">
        <Link href={cancelHref}>
          <Button
            type="button"
            variant="outline"
            className="border-[var(--border)] bg-[var(--bg-1)] text-[13px] text-[var(--text-2)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
          >
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={!canSubmit || submitting}
          className={cn(
            "gap-1.5 border px-4 text-[13px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60",
            SUBMIT_ACCENT[accent],
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <SubmitIcon className="h-3.5 w-3.5" />
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ── Preview ─────────────────────────────────────────────────── */

export function PreviewRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2.5 text-[11.5px]">
      <span className="font-medium text-[var(--text-4)]">{label}</span>
      <span
        className={cn(
          "text-right font-medium text-[var(--text-2)]",
          mono && "font-mono tabular-nums",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function PreviewCard({
  accent,
  initials,
  name,
  email,
  badgeLabel,
  badgeIcon: BadgeIcon,
  children,
}: {
  accent: Accent;
  initials: string;
  name: string;
  email: string;
  badgeLabel: string;
  badgeIcon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="uv2c-preview">
      <div className="mb-2.5 pl-[2px] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-4)]">
        Preview
      </div>
      <div className="sticky top-6 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] p-5">
        <div
          className={cn(
            "mb-3.5 grid h-14 w-14 place-items-center rounded-full border-[1.5px] text-[20px] font-bold tracking-[-0.02em]",
            PREVIEW_AVATAR[accent],
          )}
        >
          {initials}
        </div>
        <div className="text-[15px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-1)]">
          {name}
        </div>
        <div className="mt-0.5 font-mono text-[12px] text-[var(--text-4)]">
          {email}
        </div>
        <span
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[4px] text-[11px] font-medium",
            PREVIEW_BADGE[accent],
          )}
        >
          <BadgeIcon className="h-[11px] w-[11px]" />
          {badgeLabel}
        </span>
        <div className="my-4 h-px bg-[linear-gradient(90deg,transparent,var(--border),transparent)]" />
        {children}
      </div>
    </div>
  );
}
