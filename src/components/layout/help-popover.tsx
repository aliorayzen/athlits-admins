"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Book,
  FileText,
  HelpCircle,
  Keyboard,
  LifeBuoy,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Receipt,
  Search,
  Sparkles,
  UserPlus,
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type TriggerRender = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) => React.ReactElement;

interface HelpPopoverProps {
  renderTrigger: TriggerRender;
}

interface HelpItem {
  label: string;
  description?: string;
  icon: typeof Book;
  href?: string;
  external?: boolean;
  kbd?: string;
}

interface HelpGroup {
  label: string;
  items: HelpItem[];
}

const HELP_GROUPS: HelpGroup[] = [
  {
    label: "Getting started",
    items: [
      {
        label: "Dashboard overview",
        description: "KPIs, charts, and daily snapshot",
        icon: LayoutDashboard,
        href: "/dashboard",
      },
      {
        label: "Add your first venue",
        description: "Create venues and assign managers",
        icon: MapPin,
        href: "/dashboard/venues/new",
      },
      {
        label: "Create a user",
        description: "Onboard admins and venue managers",
        icon: UserPlus,
        href: "/dashboard/users/create",
      },
    ],
  },
  {
    label: "Common tasks",
    items: [
      {
        label: "Mark an invoice as paid",
        description: "Record payment reference and reconcile",
        icon: Receipt,
        href: "/dashboard/invoices",
      },
      {
        label: "Export data to CSV",
        description: "Available on venues, invoices, and users",
        icon: FileText,
      },
    ],
  },
  {
    label: "Reference",
    items: [
      {
        label: "Keyboard shortcuts",
        description: "Speed up your workflow",
        icon: Keyboard,
        kbd: "?",
      },
      {
        label: "Changelog",
        description: "What shipped recently",
        icon: Sparkles,
        external: true,
      },
      {
        label: "Documentation",
        description: "Full admin guide",
        icon: Book,
        external: true,
      },
    ],
  },
];

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["/"], label: "Focus search" },
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["G", "D"], label: "Go to dashboard" },
  { keys: ["G", "V"], label: "Go to venues" },
  { keys: ["G", "I"], label: "Go to invoices" },
  { keys: ["G", "U"], label: "Go to users" },
];

export function HelpPopover({ renderTrigger }: HelpPopoverProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "shortcuts">("main");
  const [query, setQuery] = useState("");

  // Reset view + query when popover closes
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setTimeout(() => {
        setView("main");
        setQuery("");
      }, 150);
    }
  }

  const q = query.trim().toLowerCase();
  const filteredGroups = q
    ? HELP_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            i.description?.toLowerCase().includes(q),
        ),
      })).filter((g) => g.items.length > 0)
    : HELP_GROUPS;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={renderTrigger} />
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        alignOffset={-4}
        className="w-[360px] max-w-[92vw] overflow-hidden rounded-lg border border-white/[0.08] bg-[#0a0d14] p-0 text-[var(--text-1)] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] ring-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            {view === "shortcuts" ? (
              <>
                <Keyboard className="h-[15px] w-[15px] text-[var(--text-3)]" />
                <span className="text-[14px] font-semibold tracking-[-0.01em]">
                  Keyboard shortcuts
                </span>
              </>
            ) : (
              <>
                <HelpCircle className="h-[15px] w-[15px] text-[var(--text-3)]" />
                <span className="text-[14px] font-semibold tracking-[-0.01em]">
                  Help &amp; docs
                </span>
              </>
            )}
          </div>
          {view === "shortcuts" && (
            <button
              type="button"
              onClick={() => setView("main")}
              className="text-[11px] font-medium text-[var(--text-3)] transition-colors hover:text-[var(--teal-text)]"
            >
              Back
            </button>
          )}
        </div>

        {view === "main" ? (
          <>
            {/* Search */}
            <div className="border-b border-white/[0.04] p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-[10px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[var(--text-4)]" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search help…"
                  className="h-8 w-full rounded-md border border-white/[0.06] bg-white/[0.02] pl-[32px] pr-3 text-[12.5px] text-[var(--text-1)] outline-none transition-all placeholder:text-[var(--text-4)] focus:border-[var(--teal)] focus:shadow-[0_0_0_3px_var(--teal-subtle)]"
                />
              </div>
            </div>

            {/* Grouped list */}
            <div className="flex max-h-[400px] flex-col overflow-y-auto py-1.5">
              {filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1 px-4 py-8">
                  <div className="text-[12.5px] font-medium text-[var(--text-2)]">
                    No matches
                  </div>
                  <div className="text-[11px] text-[var(--text-4)]">
                    Try a different keyword
                  </div>
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.label} className="px-1.5 py-1">
                    <div className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
                      {group.label}
                    </div>
                    {group.items.map((item) => (
                      <HelpItemRow
                        key={item.label}
                        item={item}
                        onActivate={() => {
                          if (item.label === "Keyboard shortcuts") {
                            setView("shortcuts");
                          } else {
                            setOpen(false);
                          }
                        }}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 border-t border-white/[0.06] bg-white/[0.015] px-3 py-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1.5 text-[11.5px] font-medium text-[var(--text-2)] transition-all hover:border-[rgba(0,212,170,0.18)] hover:bg-[var(--teal-subtle)] hover:text-[var(--teal-text)]"
              >
                <LifeBuoy className="h-[12px] w-[12px]" />
                Contact support
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="System status"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1.5 text-[11.5px] font-medium text-[var(--text-2)] transition-all hover:bg-white/[0.04] hover:text-[var(--text-1)]"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--semantic-green)] shadow-[0_0_5px_var(--semantic-green)]"
                  aria-hidden="true"
                />
                All systems operational
              </button>
            </div>
          </>
        ) : (
          /* ─── Shortcuts view ─── */
          <div className="flex flex-col divide-y divide-white/[0.04]">
            {SHORTCUTS.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <span className="text-[12.5px] text-[var(--text-2)]">
                  {s.label}
                </span>
                <div className="flex gap-1">
                  {s.keys.map((k) => (
                    <kbd
                      key={k}
                      className="inline-flex min-w-[20px] items-center justify-center rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-[1.5px] font-mono text-[10px] font-medium text-[var(--text-3)]"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function HelpItemRow({
  item,
  onActivate,
}: {
  item: HelpItem;
  onActivate: () => void;
}) {
  const Icon = item.icon;
  const content = (
    <>
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] border border-white/[0.06] bg-white/[0.02] text-[var(--text-3)] transition-colors group-hover:border-[rgba(0,212,170,0.18)] group-hover:bg-[var(--teal-subtle)] group-hover:text-[var(--teal-text)]">
        <Icon className="h-[13px] w-[13px]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
        <div className="flex items-center gap-2 text-[12.5px] font-medium text-[var(--text-1)]">
          {item.label}
          {item.external && (
            <ArrowUpRight className="h-[11px] w-[11px] text-[var(--text-4)]" />
          )}
        </div>
        {item.description && (
          <div className="truncate text-[11px] text-[var(--text-4)]">
            {item.description}
          </div>
        )}
      </div>
      {item.kbd && (
        <kbd className="inline-flex min-w-[20px] items-center justify-center rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-[1.5px] font-mono text-[10px] font-medium text-[var(--text-3)]">
          {item.kbd}
        </kbd>
      )}
    </>
  );

  const className = cn(
    "group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-white/[0.03]",
  );

  if (item.href) {
    return (
      <a
        href={item.href}
        onClick={onActivate}
        className={className}
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noopener noreferrer" : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onActivate} className={className}>
      {content}
    </button>
  );
}

// Suppress unused icon imports reserved for future help topics
void MessageCircle;
