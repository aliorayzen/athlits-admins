import type { StoreDateRange, StorePlatform } from "@/types/store-analytics";

export const STORE_METRICS = {
  GOOGLE_PLAY: [
    ["DAILY_USER_INSTALLS", "Daily user installs"],
    ["DAILY_USER_UNINSTALLS", "Daily user uninstalls"],
    ["ACTIVE_DEVICE_INSTALLS", "Active device installs"],
    ["RATING", "Rating"],
    ["CRASHES", "Crashes"],
  ],
  APPLE: [
    ["IMPRESSIONS", "Impressions"],
    ["PRODUCT_PAGE_VIEWS", "Product page views"],
    ["FIRST_TIME_DOWNLOADS", "First-time downloads"],
    ["REDOWNLOADS", "Redownloads"],
    ["INSTALLATIONS", "Installations"],
    ["DELETIONS", "Deletions"],
    ["SESSIONS", "Sessions"],
    ["APPLE_CRASHES", "Crashes"],
  ],
} as const;

export type StoreMetric = (typeof STORE_METRICS)[StorePlatform][number][0];

export const STORE_NAMES: Record<StorePlatform, string> = {
  GOOGLE_PLAY: "Google Play",
  APPLE: "App Store",
};

export function metricLabel(platform: StorePlatform, metric: string): string {
  return STORE_METRICS[platform].find(([key]) => key === metric)?.[1] ?? metric;
}

const DAY_MS = 86_400_000;

function dateTimestamp(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp
    : NaN;
}

export function validateStoreRange({
  from,
  to,
}: StoreDateRange): string | undefined {
  const start = dateTimestamp(from);
  const end = dateTimestamp(to);
  if (!Number.isFinite(start) || !Number.isFinite(end))
    return "Enter valid start and end dates.";
  if (start > end) return "Start date must be on or before end date.";
  if ((end - start) / DAY_MS + 1 > 366)
    return "Choose a range of 366 days or fewer.";
}

export function defaultStoreRange(now = new Date()): StoreDateRange {
  const to = now.toISOString().slice(0, 10);
  return {
    from: new Date(dateTimestamp(to) - 29 * DAY_MS).toISOString().slice(0, 10),
    to,
  };
}

export function storeFreshness(dataThrough?: string, now = new Date()): string {
  if (!dataThrough || !Number.isFinite(dateTimestamp(dataThrough)))
    return "No data yet";
  const days = Math.max(
    0,
    Math.floor(
      (dateTimestamp(now.toISOString().slice(0, 10)) -
        dateTimestamp(dataThrough)) /
        DAY_MS,
    ),
  );
  return `Data through ${dataThrough}${days > 0 ? ` · ${days} ${days === 1 ? "day" : "days"} behind` : ""}`;
}

export function formatStoreValue(value?: number): string {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 20 }).format(
        value,
      )
    : "No data yet";
}
