"use client";

import { useId } from "react";
import { AlertTriangle, Lock, RefreshCw } from "lucide-react";

import { StrengthMeter } from "./form-primitives";

/**
 * Temporary-password field for the Venue Manager flow. VMs log in with email +
 * temp password (rotated on first login), so this is the only consumer of the
 * password generator/strength helpers — they live here rather than in a shared
 * lib to keep the logic next to its single call site.
 */

const LOWERS = "abcdefghijkmnpqrstuvwxyz";
const UPPERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*-_+=";
const DEFAULT_LENGTH = 12;

/**
 * Generate a password matching common "one symbol, uppercase, digit,
 * length>=10" rules. Uses crypto.getRandomValues for entropy and avoids
 * lookalike characters (0/O, 1/l, etc.).
 */
export function generatePassword(length = DEFAULT_LENGTH): string {
  const all = LOWERS + UPPERS + DIGITS + SYMBOLS;
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  // Guarantee at least one of each character class.
  const out: string[] = [
    LOWERS[buf[0] % LOWERS.length],
    UPPERS[buf[1] % UPPERS.length],
    DIGITS[buf[2] % DIGITS.length],
    SYMBOLS[buf[3] % SYMBOLS.length],
  ];
  for (let i = 4; i < length; i += 1) out.push(all[buf[i] % all.length]);
  // Fisher-Yates shuffle with an independent random source.
  const extra = new Uint32Array(out.length);
  crypto.getRandomValues(extra);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = extra[i] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}

export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password) && password.length >= 10) score += 1;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

export function TempPasswordField({
  value,
  onChange,
  strength,
}: {
  value: string;
  onChange: (v: string) => void;
  strength: 0 | 1 | 2 | 3 | 4;
}) {
  const inputId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]"
      >
        <span>
          Temporary password
          <span className="ml-1.5 text-[var(--semantic-red)] opacity-85">
            *
          </span>
        </span>
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-[11px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[var(--text-4)] transition-colors" />
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tr-4xV9-bQ82!"
          className="h-[38px] w-full rounded-md border border-[var(--border)] bg-[var(--bg-0)] pl-[34px] pr-[108px] font-mono text-[13px] tracking-[0.02em] text-[var(--text-1)] outline-none transition-all placeholder:text-[var(--text-4)] focus:border-[var(--semantic-amber)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]"
        />
        <button
          type="button"
          onClick={() => onChange(generatePassword())}
          title="Generate new password"
          className="absolute right-1 top-1/2 inline-flex h-7 -translate-y-1/2 items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--bg-2)] px-2.5 font-mono text-[11px] font-medium text-[var(--text-3)] transition-all hover:border-[rgba(245,158,11,0.3)] hover:bg-[rgba(245,158,11,0.1)] hover:text-[var(--semantic-amber)]"
        >
          <RefreshCw className="h-[11px] w-[11px]" />
          Generate
        </button>
      </div>
      <StrengthMeter strength={strength} />
      <div className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-[1.4] text-[var(--semantic-amber)]">
        <AlertTriangle className="mt-0.5 h-[11px] w-[11px] flex-shrink-0" />
        <span>
          Share this password with the manager via a secure channel — it
          won&apos;t be shown again after creation.
        </span>
      </div>
    </div>
  );
}
