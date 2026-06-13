/**
 * Notification types + helpers. There is no notification feed endpoint yet, so
 * the UI renders an empty state until one ships — no fabricated data here.
 */

export type NotificationType =
  | "invoice_overdue"
  | "invoice_paid"
  | "venue_new"
  | "user_new"
  | "session_new"
  | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Short relative time ("3h", "2d") for a notification timestamp. */
export function relativeTimeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / MIN);
  const h = Math.floor(diff / HOUR);
  const d = Math.floor(diff / DAY);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}
