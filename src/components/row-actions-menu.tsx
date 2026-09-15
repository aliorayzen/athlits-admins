"use client";

import { MoreHorizontal } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * The row-level "…" menu shared by every directory table.
 *
 * Tables used to line up one icon button per action, which cost horizontal
 * space, put destructive actions a mis-click away from safe ones, and left the
 * meaning of each icon to guesswork. Collapsing them into one labelled list
 * fixes all three and keeps the action column a fixed width no matter how many
 * actions a row happens to have.
 */
export function RowActionsMenu({
  label,
  children,
  className,
}: {
  /** Names the row, e.g. "invoice 4f3a91b2" — becomes the trigger's a11y name. */
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            aria-label={`Actions for ${label}`}
            className={cn(
              // Always visible rather than hover-revealed: a row's actions are
              // not discoverable if they only exist on hover, and hover does
              // not exist on touch at all.
              "grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-3)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] data-[popup-open]:border-[var(--border-strong)] data-[popup-open]:bg-[var(--bg-2)] data-[popup-open]:text-[var(--text-1)]",
              className,
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      />
      <DropdownMenuContent
        align="end"
        // DropdownMenuContent defaults to the trigger's width; on a 32px kebab
        // that would collapse the menu, so the width is set explicitly here.
        className="w-56 border-[var(--border)] bg-[var(--bg-1)] shadow-[var(--shadow-3)]"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * A labelled set of related actions.
 *
 * The label and its items MUST share a group: Base UI implements the label as
 * Menu.GroupLabel, which throws "MenuGroupRootContext is missing" if it is not
 * inside a Menu.Group. Wrapping them together here makes that impossible to get
 * wrong at the call site.
 */
export function RowActionsGroup({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <DropdownMenuGroup>
      {label && (
        <DropdownMenuLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
          {label}
        </DropdownMenuLabel>
      )}
      {children}
    </DropdownMenuGroup>
  );
}

export function RowActionsSeparator() {
  return <DropdownMenuSeparator className="bg-[var(--border)]" />;
}

/**
 * `tone` carries meaning, not decoration: "danger" is reserved for actions that
 * destroy or revoke, so a destructive item never looks like a neutral one.
 */
export function RowActionItem({
  icon: Icon,
  children,
  onSelect,
  disabled,
  tone = "default",
  hint,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  /** Right-aligned secondary text, e.g. a keyboard hint or a state note. */
  hint?: string;
}) {
  const danger = tone === "danger";
  return (
    <DropdownMenuItem
      onClick={onSelect}
      disabled={disabled}
      variant={danger ? "destructive" : "default"}
      className={cn(
        "gap-2 px-2 py-1.5 text-[13px]",
        danger ? "text-[var(--red-text)]" : "text-[var(--text-2)]",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          danger ? "text-[var(--red-text)]" : "text-[var(--text-4)]",
        )}
      />
      {children}
      {hint && (
        <span className="ml-auto text-[10.5px] text-[var(--text-4)]">
          {hint}
        </span>
      )}
    </DropdownMenuItem>
  );
}
