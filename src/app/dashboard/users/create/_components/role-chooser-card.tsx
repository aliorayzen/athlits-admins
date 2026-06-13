import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Accent } from "./form-primitives";

/**
 * Navigation card for the create-user chooser. Reuses the visual language of
 * the old in-form RoleCard (icon tile, perk list, accent), but is a plain
 * <Link> rather than a radio toggle — it routes to a dedicated flow instead of
 * selecting state. Renders on the server: no client JS, hover is pure CSS.
 */
interface RoleChooserCardProps {
  href: string;
  accent: Accent;
  icon: LucideIcon;
  title: string;
  description: string;
  perks: string[];
}

const ICON_TILE: Record<Accent, string> = {
  teal: "border-[rgba(0,212,170,0.2)] bg-[rgba(0,212,170,0.14)] text-[var(--teal-text)]",
  amber:
    "border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.14)] text-[var(--semantic-amber)]",
};

const PERK_ICON: Record<Accent, string> = {
  teal: "text-[var(--teal-text)]",
  amber: "text-[var(--semantic-amber)]",
};

export function RoleChooserCard({
  href,
  accent,
  icon: Icon,
  title,
  description,
  perks,
}: RoleChooserCardProps) {
  return (
    <Link
      href={href}
      className="uv2c-role-card group relative block rounded-md border border-[var(--border)] bg-[var(--bg-2)] px-4 py-4 text-left"
    >
      <div className="mb-2 flex items-center gap-2.5">
        <div
          className={cn(
            "grid h-[34px] w-[34px] place-items-center rounded-lg border",
            ICON_TILE[accent],
          )}
        >
          <Icon className="h-[17px] w-[17px]" />
        </div>
        <div className="text-[14px] font-semibold leading-[1.2] tracking-[-0.005em] text-[var(--text-1)]">
          {title}
        </div>
      </div>
      <div className="text-[12px] leading-[1.5] text-[var(--text-3)]">
        {description}
      </div>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {perks.map((perk) => (
          <li
            key={perk}
            className="flex items-start gap-1.5 text-[11.5px] leading-[1.4] text-[var(--text-3)]"
          >
            <CheckCircle
              className={cn(
                "mt-[2px] h-[10px] w-[10px] flex-shrink-0",
                PERK_ICON[accent],
              )}
            />
            <span>{perk}</span>
          </li>
        ))}
      </ul>
      <span
        className={cn(
          "absolute right-3.5 top-3.5 grid h-6 w-6 place-items-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-1)] text-[var(--text-4)] transition-all group-hover:translate-x-px",
          accent === "amber"
            ? "group-hover:border-[rgba(245,158,11,0.4)] group-hover:text-[var(--semantic-amber)]"
            : "group-hover:border-[rgba(0,212,170,0.4)] group-hover:text-[var(--teal-text)]",
        )}
      >
        <ArrowRight className="h-[13px] w-[13px]" />
      </span>
    </Link>
  );
}
