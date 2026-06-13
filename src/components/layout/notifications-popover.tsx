"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  MapPin,
  Shield,
  Sparkles,
  UserPlus,
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  relativeTimeShort,
  type AppNotification,
  type NotificationType,
} from "@/lib/notifications";
import { getDuePayments } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { InvoiceResponse } from "@/types/api";

const READ_NOTIFICATION_IDS_KEY = "arena-admin:read-notification-ids";

const TYPE_META: Record<
  NotificationType,
  {
    icon: typeof Bell;
    iconClass: string;
    bgClass: string;
  }
> = {
  invoice_overdue: {
    icon: AlertTriangle,
    iconClass: "text-[var(--semantic-red)]",
    bgClass: "bg-[rgba(244,63,94,0.1)] border-[rgba(244,63,94,0.2)]",
  },
  invoice_paid: {
    icon: CheckCircle,
    iconClass: "text-[var(--semantic-green)]",
    bgClass: "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]",
  },
  venue_new: {
    icon: MapPin,
    iconClass: "text-[var(--teal-text)]",
    bgClass: "bg-[var(--teal-subtle)] border-[rgba(0,212,170,0.18)]",
  },
  user_new: {
    icon: UserPlus,
    iconClass: "text-[#818cf8]",
    bgClass: "bg-[rgba(99,102,241,0.1)] border-[rgba(99,102,241,0.2)]",
  },
  session_new: {
    icon: Shield,
    iconClass: "text-[var(--semantic-amber)]",
    bgClass: "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]",
  },
  system: {
    icon: Sparkles,
    iconClass: "text-[var(--text-3)]",
    bgClass: "bg-white/[0.04] border-[var(--border)]",
  },
};

type TriggerRender = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
  meta: { unreadCount: number; highPriorityCount: number },
) => React.ReactElement;

interface NotificationsPopoverProps {
  /** Render-prop for the trigger button. Apply `props` to your button. */
  renderTrigger: TriggerRender;
}

export function NotificationsPopover({
  renderTrigger,
}: NotificationsPopoverProps) {
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(
    () => readStoredNotificationIds(),
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );
  const highPriorityCount = useMemo(
    () =>
      notifications.filter((n) => n.type === "invoice_overdue" && !n.read)
        .length,
    [notifications],
  );

  const loadHighPriorityNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const duePayments = await getDuePayments();
      const overdueNotifications = (duePayments.invoices ?? [])
        .filter((invoice) => invoice.status === "OVERDUE")
        .map(toOverdueNotification)
        .map((notification) => ({
          ...notification,
          read: readNotificationIds.has(notification.id),
        }));

      setNotifications(overdueNotifications);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [readNotificationIds]);

  useEffect(() => {
    void loadHighPriorityNotifications();
  }, [loadHighPriorityNotifications]);

  useEffect(() => {
    if (open) {
      void loadHighPriorityNotifications();
    }
  }, [loadHighPriorityNotifications, open]);

  function markAllRead() {
    const nextReadIds = new Set(readNotificationIds);
    notifications.forEach((notification) => nextReadIds.add(notification.id));
    setReadNotificationIds(nextReadIds);
    writeStoredNotificationIds(nextReadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markOneRead(id: string) {
    const nextReadIds = new Set(readNotificationIds);
    nextReadIds.add(id);
    setReadNotificationIds(nextReadIds);
    writeStoredNotificationIds(nextReadIds);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={(props) =>
          renderTrigger(props, { unreadCount, highPriorityCount })
        }
      />
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
            <Bell className="h-[15px] w-[15px] text-[var(--text-3)]" />
            <span className="text-[14px] font-semibold tracking-[-0.01em]">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[rgba(244,63,94,0.15)] px-1.5 text-[10px] font-semibold tabular-nums text-[var(--semantic-red)]">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[11px] font-medium text-[var(--text-3)] transition-colors hover:text-[var(--teal-text)]"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-8">
            <div className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-white/[0.02]">
              <Bell className="h-4 w-4 text-[var(--text-4)]" />
            </div>
            <div className="text-[13px] font-medium text-[var(--text-2)]">
              {loading
                ? "Checking priority notifications"
                : "You\u0027re all caught up"}
            </div>
            <div className="text-[11.5px] text-[var(--text-4)]">
              {loading ? "Looking for overdue payments" : "No overdue payments"}
            </div>
          </div>
        ) : (
          <div className="flex max-h-[420px] flex-col overflow-y-auto">
            {notifications.map((n, i) => {
              const meta = TYPE_META[n.type];
              const Icon = meta.icon;

              const commonClass = cn(
                "group relative flex items-start gap-2.5 px-4 py-3 text-left transition-colors",
                i > 0 && "border-t border-white/[0.04]",
                !n.read
                  ? "bg-[rgba(0,212,170,0.025)] hover:bg-[rgba(0,212,170,0.045)]"
                  : "hover:bg-white/[0.025]",
              );

              const inner = (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-2 h-2 w-2 shrink-0 rounded-full transition-colors",
                      n.read
                        ? "bg-transparent"
                        : "bg-[var(--teal)] shadow-[0_0_6px_var(--teal-glow)]",
                    )}
                  />
                  <div
                    className={cn(
                      "mt-[1px] grid h-7 w-7 shrink-0 place-items-center rounded-[7px] border",
                      meta.bgClass,
                    )}
                  >
                    <Icon className={cn("h-[13px] w-[13px]", meta.iconClass)} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={cn(
                          "text-[12.5px] leading-[1.35] tracking-[-0.005em]",
                          n.read
                            ? "font-normal text-[var(--text-2)]"
                            : "font-medium text-[var(--text-1)]",
                        )}
                      >
                        {n.title}
                      </div>
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--text-4)]">
                        {relativeTimeShort(n.createdAt)}
                      </span>
                    </div>
                    <div className="truncate text-[11.5px] leading-[1.4] text-[var(--text-4)]">
                      {n.description}
                    </div>
                  </div>
                </>
              );

              return n.link ? (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => {
                    markOneRead(n.id);
                    setOpen(false);
                  }}
                  className={commonClass}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markOneRead(n.id)}
                  className={cn(commonClass, "w-full")}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-white/[0.06] bg-white/[0.015] px-3 py-2">
            <Link
              href="/dashboard/invoices?status=OVERDUE"
              className="flex w-full items-center justify-center rounded-md px-2 py-1.5 text-[11.5px] font-medium text-[var(--text-3)] transition-all hover:bg-white/[0.035] hover:text-[var(--text-1)]"
              onClick={() => setOpen(false)}
            >
              View overdue invoices
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function toOverdueNotification(invoice: InvoiceResponse): AppNotification {
  const venueName = invoice.venueName?.trim();
  const params = new URLSearchParams();
  if (venueName) {
    params.set("venueName", venueName);
  }
  params.set("status", "OVERDUE");

  return {
    id: `invoice-overdue-${invoice.id}`,
    type: "invoice_overdue",
    title: venueName
      ? `Payment overdue: ${venueName}`
      : `Payment overdue: invoice ${invoice.id}`,
    description: `${formatMoney(invoice.amount, invoice.currencyCode)} due ${formatShortDate(
      invoice.dueDate,
    )}`,
    createdAt: invoice.dueDate,
    read: false,
    link: `/dashboard/invoices?${params.toString()}`,
  };
}

function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function readStoredNotificationIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(READ_NOTIFICATION_IDS_KEY) ?? "[]",
    );
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeStoredNotificationIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      READ_NOTIFICATION_IDS_KEY,
      JSON.stringify([...ids].slice(-200)),
    );
  } catch {
    // Ignore storage failures; in-memory state still updates for this session.
  }
}
