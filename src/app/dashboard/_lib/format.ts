// Backend payloads aren't always complete — invoices in flight, partial
// resources, optional fields. These helpers all accept null/undefined and
// return a visible em-dash placeholder rather than crashing the page render.

const PLACEHOLDER = "—";

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Working late";
}

export function formatNumber(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return PLACEHOLDER;
  return n.toLocaleString("en-US");
}

// "Today · 3:14 PM" / "Yesterday · 9:00 AM" / "Apr 14" depending on recency.
export function formatSlot(dateStr: string | null | undefined): string {
  if (!dateStr) return PLACEHOLDER;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return PLACEHOLDER;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (isToday) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return PLACEHOLDER;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return PLACEHOLDER;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function initials(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
