"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Settings,
  LogOut,
  Menu,
  Receipt,
  Search,
  HelpCircle,
  ChevronsUpDown,
  Shield,
  Table as TableIcon,
  UserPlus,
  UserRound,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { getDisplayName, getInitials } from "@/lib/user-display";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";
import { HelpPopover } from "@/components/layout/help-popover";
import { useSidebarStats } from "@/components/layout/use-sidebar-stats";
import { AthlitsLogo } from "@/components/athlits-logo";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
  count?: number;
  kbd?: string;
}

interface NavSection {
  label: string;
  dotTone: "teal" | "amber";
  items: NavItem[];
}

function buildNavSections(stats: {
  venuesTotal: number | null;
  invoicesOverdue: number | null;
}): NavSection[] {
  return [
    {
      label: "Platform",
      dotTone: "teal",
      items: [
        {
          href: "/dashboard",
          label: "Overview",
          icon: LayoutDashboard,
          kbd: "1",
        },
        {
          href: "/dashboard/onboarding/venue-manager",
          label: "Onboarding VM",
          icon: UserPlus,
        },
        {
          href: "/dashboard/invoices",
          label: "Invoices",
          icon: Receipt,
          badge:
            stats.invoicesOverdue && stats.invoicesOverdue > 0
              ? stats.invoicesOverdue
              : undefined,
        },
      ],
    },
    {
      label: "Administration",
      dotTone: "amber",
      items: [
        {
          href: "/dashboard/users/admins",
          label: "Admins",
          icon: Shield,
        },
        {
          href: "/dashboard/users/venue-managers",
          label: "Venue Managers",
          icon: TableIcon,
        },
        {
          href: "/dashboard/venues",
          label: "Venues",
          icon: MapPin,
          count: stats.venuesTotal ?? undefined,
          kbd: "2",
        },
        {
          href: "/dashboard/users/players",
          label: "Players",
          icon: UserRound,
        },
        {
          href: "/dashboard/users/restorable",
          label: "Restorable Accounts",
          icon: RotateCcw,
        },
        {
          href: "/dashboard/settings",
          label: "Settings",
          icon: Settings,
          kbd: "5",
        },
      ],
    },
  ];
}

function formatStat(value: number | null): string {
  return value === null ? "—" : String(value);
}

function NavRow({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const { href, label, icon: Icon, badge, count, kbd } = item;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "sv2-nav-row relative mb-px flex items-center gap-2.5 rounded-[6px] text-[13px]",
        isActive
          ? "sv2-nav-row-active border border-[rgba(0,212,170,0.16)] bg-[linear-gradient(90deg,rgba(0,212,170,0.13),rgba(0,212,170,0.04)_70%,transparent),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_50%)] px-2.5 py-1.5 font-medium text-white"
          : "px-2.5 py-[7px] font-normal text-[#a8aebb] hover:bg-white/[0.035] hover:text-white",
      )}
    >
      {isActive && (
        <span className="absolute left-[-10px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-sm bg-[var(--teal)] shadow-[0_0_10px_var(--teal-glow)]" />
      )}
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-opacity",
          isActive ? "text-[#39e0bb] opacity-100" : "opacity-55",
        )}
      />
      <span className="flex-1 tracking-[-0.005em]">{label}</span>
      {badge !== undefined && (
        <span className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-[var(--semantic-red-subtle)] px-[5px] text-[10px] font-semibold leading-none tabular-nums text-[var(--semantic-red)]">
          {badge}
        </span>
      )}
      {count !== undefined && badge === undefined && (
        <span className="font-mono text-[11px] font-medium tabular-nums text-[#545967]">
          {count}
        </span>
      )}
      {kbd !== undefined && badge === undefined && count === undefined && (
        <span
          className={cn(
            "font-mono text-[10px] font-medium tabular-nums transition-opacity",
            isActive
              ? "text-[#39e0bb] opacity-85"
              : "text-[#545967] opacity-35",
          )}
        >
          {kbd}
        </span>
      )}
    </Link>
  );
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const stats = useSidebarStats();
  const navSections = buildNavSections({
    venuesTotal: stats.venuesTotal,
    invoicesOverdue: stats.invoicesOverdue,
  });

  // Overview matches exactly (it's a prefix of every other route); the rest
  // match by prefix so deeper sub-pages keep their nav item highlighted.
  const rowIsActive = (href: string): boolean =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const initials = getInitials(user);
  const displayName = getDisplayName(user);

  return (
    <div className="sidebar-v2 relative flex h-full flex-col overflow-hidden">
      {/* content sits above the noise ::before layer */}
      <div className="relative z-[1] flex h-full flex-col">
        {/* ══════════════ Workspace pill ══════════════ */}
        <button
          type="button"
          aria-label="Athlits Admin Console workspace"
          title="Athlits Admin Console"
          className="sv2-workspace mx-3 mb-2 mt-3 flex items-center gap-2.5 rounded-[8px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(0,212,170,0.04),rgba(0,212,170,0.015)_60%,transparent)] px-2.5 py-2 text-left hover:border-[rgba(0,212,170,0.16)] hover:bg-[linear-gradient(180deg,rgba(0,212,170,0.06),rgba(0,212,170,0.02))]"
        >
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[rgba(0,212,170,0.18)] bg-[linear-gradient(135deg,rgba(0,212,170,0.14),rgba(0,212,170,0.04))]">
            <AthlitsLogo size={18} className="h-[18px] w-[18px]" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <div className="text-[13px] font-semibold leading-tight tracking-[-0.01em] text-white">
              Athlits
            </div>
            <div className="text-[10px] font-medium uppercase leading-[1.3] tracking-[0.04em] text-[#39e0bb]">
              Admin Console
            </div>
          </div>
          <ChevronsUpDown className="h-3 w-3 shrink-0 text-[#545967] opacity-60" />
        </button>

        {/* ══════════════ Search ══════════════ */}
        <button
          type="button"
          aria-label="Open search (Ctrl+K)"
          className="mx-3 mb-2 flex items-center gap-2 rounded-[6px] border border-white/[0.06] bg-white/[0.015] px-2.5 py-[7px] transition-all hover:border-white/10 hover:bg-white/[0.03] focus-visible:border-[var(--teal)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--teal-subtle)]"
        >
          <Search className="h-[13px] w-[13px] shrink-0 text-[#545967]" />
          <span className="flex-1 text-left text-[12.5px] text-[#737986]">
            Search
          </span>
          <kbd className="inline-flex items-center rounded border border-white/[0.06] bg-white/[0.04] px-[5px] py-px font-mono text-[10px] font-medium leading-[1.4] text-[#737986]">
            ⌘K
          </kbd>
        </button>

        {/* ══════════════ Live stats strip ══════════════ */}
        <div
          role="group"
          aria-label="Venue status summary"
          title="Venue status"
          className="sv2-stats mx-3 mb-2 flex cursor-pointer rounded-[6px] border border-white/[0.06] bg-white/[0.012] px-1 py-2.5 hover:border-white/10"
        >
          <div
            className="relative flex-1 px-1 text-center"
            title={
              stats.venuesTotal === null
                ? "Loading venue count"
                : `${stats.venuesTotal} total venues`
            }
          >
            <div className="sv2-stat-value text-[17px] font-bold leading-[1.05] tracking-[-0.025em] tabular-nums text-white">
              {formatStat(stats.venuesTotal)}
            </div>
            <div className="mt-0.5 flex items-center justify-center gap-1 text-[9px] font-medium uppercase tracking-[0.08em] text-[#545967]">
              <span className="h-1 w-1 rounded-full bg-[#545967]" />
              Venues
            </div>
          </div>
          <div
            className="relative flex-1 px-1 text-center"
            title={
              stats.venuesActive === null
                ? "Loading active venue count"
                : `${stats.venuesActive} active venues`
            }
          >
            <span className="absolute inset-y-1 left-0 w-px bg-white/[0.06]" />
            <div className="sv2-stat-value text-[17px] font-bold leading-[1.05] tracking-[-0.025em] tabular-nums text-[var(--semantic-green)]">
              {formatStat(stats.venuesActive)}
            </div>
            <div className="mt-0.5 flex items-center justify-center gap-1 text-[9px] font-medium uppercase tracking-[0.08em] text-[#545967]">
              <span className="sv2-stat-dot-ok h-1 w-1 rounded-full bg-[var(--semantic-green)]" />
              Active
            </div>
          </div>
          <div
            className="relative flex-1 px-1 text-center"
            title={
              stats.invoicesOverdue === null
                ? "Loading overdue invoice count"
                : `${stats.invoicesOverdue} overdue ${
                    stats.invoicesOverdue === 1 ? "invoice" : "invoices"
                  }`
            }
          >
            <span className="absolute inset-y-1 left-0 w-px bg-white/[0.06]" />
            <div className="sv2-stat-value text-[17px] font-bold leading-[1.05] tracking-[-0.025em] tabular-nums text-[var(--semantic-red)]">
              {formatStat(stats.invoicesOverdue)}
            </div>
            <div className="mt-0.5 flex items-center justify-center gap-1 text-[9px] font-medium uppercase tracking-[0.08em] text-[#545967]">
              <span className="sv2-stat-dot-alert h-1 w-1 rounded-full bg-[var(--semantic-red)]" />
              Overdue
            </div>
          </div>
        </div>

        {/* ══════════════ Nav groups ══════════════ */}
        <nav
          aria-label="Primary"
          className="sv2-nav flex-1 overflow-y-auto px-2.5 pt-1"
        >
          {navSections.map((section, si) => (
            <div key={section.label} className={cn(si === 0 ? "mt-1" : "mt-3")}>
              <div className="flex items-center gap-[7px] px-2.5 pb-1.5 pt-2 text-[#545967]">
                <span
                  className={cn(
                    "h-[5px] w-[5px] shrink-0 rounded-full",
                    section.dotTone === "teal"
                      ? "sv2-group-dot-teal bg-[var(--teal)]"
                      : "sv2-group-dot-amber bg-[var(--semantic-amber)]",
                  )}
                />
                <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#737986]">
                  {section.label}
                </span>
                <span className="font-mono text-[10px] font-medium tabular-nums text-[#545967]">
                  {section.items.length}
                </span>
              </div>

              {section.items.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  isActive={rowIsActive(item.href)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* ══════════════ Footer ══════════════ */}
        <div className="relative border-t border-white/[0.06] p-2">
          <div className="pointer-events-none absolute inset-x-[14px] top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)]" />

          <HelpPopover
            renderTrigger={(props) => (
              <button
                {...props}
                type="button"
                aria-label="Help and documentation"
                title="Help & Docs"
                className="mb-0.5 flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[12.5px] text-[#737986] transition-all hover:bg-white/[0.035] hover:text-white data-[popup-open]:bg-white/[0.04] data-[popup-open]:text-white"
              >
                <HelpCircle
                  className="h-[15px] w-[15px] opacity-50"
                  aria-hidden="true"
                />
                <span className="flex-1 text-left">Help &amp; Docs</span>
              </button>
            )}
          />

          <div className="mx-3 my-1 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)]" />

          <div className="group flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 transition-colors hover:bg-white/[0.035]">
            <div className="relative grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border border-[rgba(0,212,170,0.16)] bg-[linear-gradient(135deg,rgba(0,212,170,0.18),rgba(0,212,170,0.04))] text-[11px] font-semibold tracking-[0.02em] text-[#39e0bb]">
              {initials || "AA"}
              <div className="absolute -bottom-px -right-px h-[9px] w-[9px] rounded-full border-2 border-[#060810] bg-[var(--semantic-green)]" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-px">
              <div className="truncate text-[12.5px] font-medium leading-tight tracking-[-0.005em] text-white">
                {displayName || "Admin"}
              </div>
              <div className="text-[10.5px] leading-[1.3] text-[#545967]">
                Administrator
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="grid h-[26px] w-[26px] place-items-center rounded-[6px] text-[#545967] opacity-0 transition-all hover:bg-[var(--semantic-red-subtle)] hover:text-[var(--semantic-red)] group-hover:opacity-100"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-[260px] shrink-0 border-r border-white/[0.06] lg:block">
      <NavContent />
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={(props) => (
          <Button {...props} variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        )}
      />
      <SheetContent side="left" className="w-[260px] border-white/[0.06] p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <NavContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
