"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  CircleAlert,
  Clock,
  Copy,
  Database,
  Globe,
  Hash,
  Info,
  Key,
  LogOut,
  Plus,
  RefreshCw,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  User,
} from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════════
   Tab definitions — horizontal tab strip matches filter chips used on
   venues/invoices/users pages. 4 tabs consolidate the 7 sections.
   ─────────────────────────────────────────────────────────────── */

type SectionId =
  | "profile"
  | "security"
  | "notifications"
  | "appearance"
  | "api-keys"
  | "platform-info"
  | "danger";

type TabId = "account" | "preferences" | "platform" | "danger";

interface TabDef {
  id: TabId;
  label: string;
  dotClass: string;
  sections: SectionId[];
  icon: typeof User;
}

const TABS: TabDef[] = [
  {
    id: "account",
    label: "Account",
    dotClass: "sv2-tab-dot-teal",
    sections: ["profile", "security"],
    icon: User,
  },
  {
    id: "preferences",
    label: "Preferences",
    dotClass: "sv2-tab-dot-blue",
    sections: ["notifications", "appearance"],
    icon: Bell,
  },
  {
    id: "platform",
    label: "Platform",
    dotClass: "sv2-tab-dot-amber",
    sections: ["api-keys", "platform-info"],
    icon: Database,
  },
  {
    id: "danger",
    label: "Danger zone",
    dotClass: "sv2-tab-dot-red",
    sections: ["danger"],
    icon: AlertTriangle,
  },
];

/* ═══════════════════════════════════════════════════════════════
   Notification preference + theme scaffolding (local UI controls)
   ─────────────────────────────────────────────────────────────── */

interface NotificationPref {
  key: string;
  label: string;
  description: string;
  defaultOn: boolean;
  chip?: { label: string; tone: "teal" };
}

const NOTIFICATION_PREFS: Array<{
  group: string;
  items: NotificationPref[];
}> = [
  {
    group: "Operations",
    items: [
      {
        key: "overdue-invoices",
        label: "Overdue invoices",
        description:
          "Alert me when any venue has invoices more than 7 days past due.",
        defaultOn: true,
      },
      {
        key: "new-venue",
        label: "New venue onboarded",
        description: "Get notified when a venue is added to the platform.",
        defaultOn: true,
      },
      {
        key: "manager-digest",
        label: "Manager activity digest",
        description: "Weekly summary of venue-manager actions and updates.",
        defaultOn: false,
      },
    ],
  },
  {
    group: "Security",
    items: [
      {
        key: "unusual-signin",
        label: "Unusual sign-in",
        description:
          "Alert me when my account is accessed from a new device or region.",
        defaultOn: true,
      },
      {
        key: "new-admin",
        label: "New admin created",
        description:
          "Notify me when a new admin user is onboarded by another admin.",
        defaultOn: true,
      },
    ],
  },
  {
    group: "Product",
    items: [
      {
        key: "product-updates",
        label: "Product updates",
        description: "Monthly digest of new features and improvements.",
        defaultOn: false,
        chip: { label: "New", tone: "teal" },
      },
    ],
  },
];

type Theme = "dark" | "light" | "system";
type Density = "compact" | "comfortable" | "spacious";

export default function SettingsPage() {
  const { user, logout } = useAuth();

  /* ── Active tab + sliding indicator ── */
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState<{
    transform: string;
    width: number;
    opacity: number;
  }>({ transform: "translateX(0px)", width: 0, opacity: 0 });

  useEffect(() => {
    const idx = TABS.findIndex((t) => t.id === activeTab);
    const el = tabRefs.current[idx];
    if (!el) return;
    setIndicator({
      transform: `translateX(${el.offsetLeft - 2}px)`,
      width: el.offsetWidth,
      opacity: 1,
    });
  }, [activeTab]);

  const activeTabDef = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  /* ── Interactive state ── */
  const [twoFactor, setTwoFactor] = useState(true);
  const [signinAlerts, setSigninAlerts] = useState(true);
  const initialNotifState = useMemo(() => {
    const state: Record<string, boolean> = {};
    NOTIFICATION_PREFS.forEach((g) =>
      g.items.forEach((i) => {
        state[i.key] = i.defaultOn;
      }),
    );
    return state;
  }, []);
  const [notifPrefs, setNotifPrefs] =
    useState<Record<string, boolean>>(initialNotifState);
  const [notifChannel, setNotifChannel] = useState<"email" | "in-app">("email");
  const [theme, setTheme] = useState<Theme>("dark");
  const [density, setDensity] = useState<Density>("comfortable");

  /* ── Mount timestamp (stable for memoized derived values) ── */
  const [mountedAt] = useState(() => Date.now());

  /* ── Derived profile values ── */
  const profile = useMemo(() => {
    const firstName = user?.firstName ?? "Admin";
    const lastName = user?.lastName ?? "";
    const email = user?.email ?? "admin@orayzen.com";
    const initials =
      `${firstName[0] ?? "A"}${lastName[0] ?? "A"}`.toUpperCase() || "AA";
    const displayName = `${firstName} ${lastName}`.trim() || "Admin";
    const userId = user?.id ?? "usr_000000000000";
    const shortId = userId.length > 16 ? userId.slice(0, 16) : userId;
    const memberSince = user?.createdAt
      ? new Date(user.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";
    const memberMonths = user?.createdAt
      ? Math.max(
          1,
          Math.floor(
            (mountedAt - new Date(user.createdAt).getTime()) /
              (86_400_000 * 30),
          ),
        )
      : 0;
    return {
      initials,
      displayName,
      email,
      userId,
      shortId,
      memberSince,
      memberMonths,
      role: user?.role ?? "ADMIN",
      status: user?.status ?? "ACTIVE",
    };
  }, [user, mountedAt]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  }, []);

  const signOutAll = useCallback(() => {
    toast.info("Signing out of all devices…");
    setTimeout(() => logout(), 600);
  }, [logout]);

  const tabSectionVisible = (id: SectionId): boolean =>
    activeTabDef.sections.includes(id);

  return (
    <div className="settings-v2">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-1.5 text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
            Settings
          </h1>
          <p className="text-[13.5px] tracking-[-0.003em] text-[var(--text-3)]">
            Your account, preferences, and platform configuration
          </p>
        </div>
      </div>

      {/* ═══════════════ Top tab strip ═══════════════ */}
      <div className="mb-6">
        <div
          role="tablist"
          aria-label="Settings sections"
          className="relative inline-flex items-center gap-[2px] rounded-md border border-[var(--border)] bg-[var(--bg-1)] p-[2px]"
        >
          <span
            className="sv2-chip-indicator"
            style={{
              transform: indicator.transform,
              width: indicator.width,
              opacity: indicator.opacity,
            }}
            aria-hidden="true"
          />
          {TABS.map((tab, i) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative z-10 inline-flex items-center gap-2 rounded-[4px] px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  active
                    ? "text-[var(--text-1)]"
                    : "text-[var(--text-3)] hover:text-[var(--text-1)]",
                )}
              >
                <span
                  className={cn("h-[5px] w-[5px] rounded-full", tab.dotClass)}
                />
                <Icon
                  className={cn(
                    "h-[13px] w-[13px]",
                    active ? "text-[var(--text-2)]" : "text-[var(--text-4)]",
                  )}
                />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════ Active tab content ═══════════════ */}
      <div key={activeTab} className="flex flex-col gap-5">
        {/* PROFILE */}
        {tabSectionVisible("profile") && (
          <SectionCard
            id="profile"
            icon={<User className="h-4 w-4" />}
            iconTone="teal"
            title="Profile"
            description="Your identity on the Athlits platform"
          >
            <div className="flex items-center gap-5 py-3.5">
              <div className="relative grid h-[72px] w-[72px] place-items-center rounded-full border-2 border-[rgba(0,212,170,0.22)] bg-[linear-gradient(135deg,rgba(0,212,170,0.28),rgba(0,212,170,0.08))] text-[24px] font-bold tracking-[-0.02em] text-[var(--teal-text)]">
                {profile.initials}
                <span className="pointer-events-none absolute inset-[-4px] rounded-full border border-[rgba(0,212,170,0.14)]" />
                <span className="absolute bottom-[1px] right-[1px] h-[14px] w-[14px] rounded-full border-[2.5px] border-[var(--bg-1)] bg-[var(--semantic-green)] shadow-[0_0_6px_var(--semantic-green)]" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <div className="text-[18px] font-semibold leading-[1.2] tracking-[-0.015em] text-[var(--text-1)]">
                  {profile.displayName}
                </div>
                <div className="font-mono text-[12.5px] text-[var(--text-3)]">
                  {profile.email}
                </div>
                <div className="mt-1 flex gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,212,170,0.14)] bg-[rgba(0,212,170,0.1)] px-2 py-[3px] text-[11px] font-medium text-[var(--teal-text)]">
                    <Shield className="h-[11px] w-[11px]" />
                    {profile.role === "ADMIN"
                      ? "Admin"
                      : profile.role === "VENUE_MANAGER"
                        ? "Venue Manager"
                        : profile.role}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(16,185,129,0.08)] px-2 py-[3px] text-[11px] font-medium text-[var(--semantic-green)]">
                    <span className="sv2-status-dot h-[5px] w-[5px] rounded-full bg-[var(--semantic-green)] shadow-[0_0_5px_var(--semantic-green)]" />
                    {profile.status === "ACTIVE" ? "Active" : profile.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-start gap-2 rounded-md border border-[rgba(99,102,241,0.14)] bg-[rgba(99,102,241,0.06)] px-3 py-2.5">
              <Info className="mt-px h-[13px] w-[13px] flex-shrink-0 text-[var(--semantic-blue)]" />
              <span className="text-[12px] leading-[1.5] text-[var(--text-2)]">
                Your identity is managed centrally by platform admins. To change
                your name or email, contact another admin.
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <IdRow
                label="User ID"
                icon={User}
                value={profile.shortId}
                onCopy={() => copyToClipboard(profile.userId, "User ID")}
                copyHint="copy"
              />
              <IdRow
                label="Member since"
                icon={Clock}
                value={profile.memberSince}
                valueSuffix={
                  profile.memberMonths > 0
                    ? `${profile.memberMonths} month${profile.memberMonths === 1 ? "" : "s"}`
                    : undefined
                }
              />
            </div>
          </SectionCard>
        )}

        {/* SECURITY */}
        {tabSectionVisible("security") && (
          <SectionCard
            id="security"
            icon={<ShieldCheck className="h-4 w-4" />}
            iconTone="blue"
            title="Security"
            description="Manage sign-in and account protection"
          >
            <ToggleRow
              label="Password"
              description="Admins sign in with a one-time code. Password login is reserved for venue managers."
              rightSlot={
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-1)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-2)] opacity-50"
                >
                  Not applicable
                </button>
              }
            />
            <ToggleRow
              label="Two-factor authentication"
              description="Require a 6-digit code from an authenticator app after OTP login for an added layer."
              chipLabel="Recommended"
              on={twoFactor}
              onChange={setTwoFactor}
            />
            <ToggleRow
              label="Sign-in alerts"
              description="Email me whenever my account is accessed from a new device."
              on={signinAlerts}
              onChange={setSigninAlerts}
            />

            <SectionLabel>Active sessions</SectionLabel>
            <div className="flex items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-2)] px-3.5 py-3">
              <Info className="mt-px h-[13px] w-[13px] flex-shrink-0 text-[var(--text-4)]" />
              <span className="text-[12px] leading-[1.5] text-[var(--text-3)]">
                Active session data isn&apos;t available yet. Once the sessions
                endpoint ships, your signed-in devices will appear here. You can
                still sign out of every device from the Danger zone.
              </span>
            </div>
          </SectionCard>
        )}

        {/* NOTIFICATIONS */}
        {tabSectionVisible("notifications") && (
          <SectionCard
            id="notifications"
            icon={<Bell className="h-4 w-4" />}
            iconTone="blue"
            title="Notifications"
            description="When and how you get alerted by email"
            headerAction={
              <div className="inline-flex rounded-md border border-[var(--border)] bg-[var(--bg-2)] p-[2px]">
                {(["email", "in-app"] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setNotifChannel(ch)}
                    className={cn(
                      "rounded-[4px] px-2.5 py-1 text-[12px] font-medium transition-colors",
                      notifChannel === ch
                        ? "bg-white/[0.05] text-[var(--text-1)] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_1px_2px_rgba(0,0,0,0.25)]"
                        : "text-[var(--text-3)] hover:text-[var(--text-1)]",
                    )}
                  >
                    {ch === "email" ? "Email" : "In-app"}
                  </button>
                ))}
              </div>
            }
          >
            {NOTIFICATION_PREFS.map((group, gi) => (
              <div key={group.group}>
                {gi > 0 && (
                  <div className="my-2 h-px bg-[linear-gradient(90deg,transparent,var(--border),transparent)]" />
                )}
                <SectionLabel>{group.group}</SectionLabel>
                {group.items.map((item) => (
                  <ToggleRow
                    key={item.key}
                    label={item.label}
                    description={item.description}
                    chipLabel={item.chip?.label}
                    on={notifPrefs[item.key] ?? false}
                    onChange={(v) =>
                      setNotifPrefs((prev) => ({ ...prev, [item.key]: v }))
                    }
                  />
                ))}
              </div>
            ))}
          </SectionCard>
        )}

        {/* APPEARANCE */}
        {tabSectionVisible("appearance") && (
          <SectionCard
            id="appearance"
            icon={<Sun className="h-4 w-4" />}
            iconTone="amber"
            title="Appearance"
            description="Theme and display density"
          >
            <SectionLabel>Theme</SectionLabel>
            <div className="grid grid-cols-3 gap-3">
              <ThemeCard
                value="dark"
                label="Dark"
                selected={theme === "dark"}
                onClick={() => setTheme("dark")}
              />
              <ThemeCard
                value="light"
                label="Light"
                selected={theme === "light"}
                onClick={() => setTheme("light")}
              />
              <ThemeCard
                value="system"
                label="System"
                selected={theme === "system"}
                onClick={() => setTheme("system")}
              />
            </div>

            <div className="mt-4">
              <SectionLabel>Density</SectionLabel>
              <div className="inline-flex rounded-md border border-[var(--border)] bg-[var(--bg-2)] p-[2px]">
                {(["compact", "comfortable", "spacious"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDensity(d)}
                    className={cn(
                      "rounded-[4px] px-2.5 py-1 text-[12px] font-medium capitalize transition-colors",
                      density === d
                        ? "bg-white/[0.05] text-[var(--text-1)] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_1px_2px_rgba(0,0,0,0.25)]"
                        : "text-[var(--text-3)] hover:text-[var(--text-1)]",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>
        )}

        {/* API KEYS */}
        {tabSectionVisible("api-keys") && (
          <SectionCard
            id="api-keys"
            icon={<Key className="h-4 w-4" />}
            iconTone="amber"
            title="API Keys"
            titleBadge={{ label: "Coming soon", tone: "amber" }}
            description="Personal tokens for programmatic platform access"
            headerAction={
              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-[rgba(0,212,170,0.3)] bg-[linear-gradient(135deg,#00d4aa_0%,#00b894_100%)] px-2.5 py-1.5 text-[12px] font-semibold text-[#032921] opacity-60"
              >
                <Plus className="h-3 w-3" />
                Create key
              </button>
            }
          >
            <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-2)]">
              <div className="grid grid-cols-[1fr_1.5fr_0.7fr_0.9fr_auto] gap-3 border-b border-[var(--border)] bg-white/[0.012] px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
                <span>Name</span>
                <span>Key</span>
                <span>Status</span>
                <span>Created</span>
                <span />
              </div>
              <div className="grid grid-cols-[1fr_1.5fr_0.7fr_0.9fr_auto] items-center gap-3 px-3.5 py-2.5 text-[13px] opacity-65">
                <span className="font-medium text-[var(--text-1)]">
                  Production read-only
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[12px] tracking-[0.02em] text-[var(--text-3)]">
                  <span className="rounded border border-[var(--border)] bg-[var(--bg-0)] px-[7px] py-[2px]">
                    sk_live_••••••••2f9a
                  </span>
                </span>
                <span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(16,185,129,0.08)] px-2 py-[2px] text-[11px] font-medium text-[var(--semantic-green)]">
                    <span className="h-[5px] w-[5px] rounded-full bg-[var(--semantic-green)] shadow-[0_0_5px_var(--semantic-green)]" />
                    Active
                  </span>
                </span>
                <span className="font-mono text-[11px] text-[var(--text-3)]">
                  Apr 12, 2026
                </span>
                <span className="inline-flex gap-1">
                  <IconBtn label="Copy" onClick={() => void 0} disabled>
                    <Copy className="h-3 w-3" />
                  </IconBtn>
                  <IconBtn label="Rotate" onClick={() => void 0} disabled>
                    <RefreshCw className="h-3 w-3" />
                  </IconBtn>
                  <IconBtn
                    label="Revoke"
                    onClick={() => void 0}
                    danger
                    disabled
                  >
                    <Trash2 className="h-3 w-3" />
                  </IconBtn>
                </span>
              </div>
              <div className="border-t border-[rgba(255,255,255,0.035)] px-7 py-7 text-center">
                <div className="text-[13px] font-medium text-[var(--text-2)]">
                  Awaiting backend endpoint
                </div>
                <div className="mx-auto mt-0.5 max-w-[360px] text-[12px] text-[var(--text-4)]">
                  API keys will be available once the token-issuance endpoint
                  ships. The row above is an illustrative preview.
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* PLATFORM INFO */}
        {tabSectionVisible("platform-info") && (
          <SectionCard
            id="platform-info"
            icon={<Database className="h-4 w-4" />}
            iconTone="neutral"
            title="Platform info"
            description="Read-only environment metadata for support and debugging"
          >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <IdRow
                label="API endpoint"
                icon={Globe}
                value={apiUrl}
                onCopy={() => copyToClipboard(apiUrl, "API endpoint")}
                copyHint="copy"
                noMono
              />
              <IdRow
                label="Version"
                icon={Hash}
                value="v1.0.0"
                badge={{ label: "stable", tone: "green" }}
                noMono
              />
              <IdRow
                label="Environment"
                icon={SettingsIcon}
                value={
                  process.env.NODE_ENV === "production"
                    ? "Production"
                    : "Development"
                }
                badge={{
                  label:
                    process.env.NODE_ENV === "production" ? "live" : "local",
                  tone:
                    process.env.NODE_ENV === "production" ? "green" : "blue",
                }}
                noMono
              />
              <IdRow
                label="Build"
                icon={Clock}
                value="athlits-admins"
                valueSuffix={new Date().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              />
            </div>
          </SectionCard>
        )}

        {/* DANGER ZONE */}
        {tabSectionVisible("danger") && (
          <SectionCard
            id="danger"
            icon={<AlertTriangle className="h-4 w-4" />}
            iconTone="red"
            title="Danger zone"
            description="Irreversible or widely-impacting actions"
          >
            <DangerRow
              label="Sign out everywhere"
              description="Immediately terminate all active sessions on every device. You'll need to sign in again with a fresh OTP."
              onClick={signOutAll}
              icon={LogOut}
              cta="Sign out everywhere"
            />
            <DangerRow
              label="Delete account"
              labelBadge={{ label: "Soon", tone: "amber" }}
              description="Permanently delete your admin account and associated audit records. This cannot be undone."
              onClick={() => void 0}
              cta="Delete account"
              disabled
            />
          </SectionCard>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Sub-components
   ─────────────────────────────────────────────────────────────── */

function SectionCard({
  id,
  icon,
  iconTone,
  title,
  titleBadge,
  description,
  headerAction,
  children,
}: {
  id: SectionId;
  icon: React.ReactNode;
  iconTone: "teal" | "blue" | "amber" | "red" | "neutral";
  title: string;
  titleBadge?: { label: string; tone: "amber" | "teal" | "green" | "blue" };
  description: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneClasses = {
    teal: "bg-[var(--teal-subtle)] border-[rgba(0,212,170,0.16)] text-[var(--teal-text)]",
    blue: "bg-[rgba(99,102,241,0.1)] border-[rgba(99,102,241,0.18)] text-[#818cf8]",
    amber:
      "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.18)] text-[var(--semantic-amber)]",
    red: "bg-[rgba(244,63,94,0.08)] border-[rgba(244,63,94,0.2)] text-[var(--semantic-red)]",
    neutral:
      "bg-[rgba(255,255,255,0.03)] border-[var(--border)] text-[var(--text-3)]",
  }[iconTone];

  return (
    <section
      data-section={id}
      className="sv2-card scroll-mt-6 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]"
    >
      <div className="flex items-start justify-between gap-5 border-b border-[var(--border)] px-[22px] pb-3.5 pt-[18px]">
        <div className="flex items-center gap-[11px]">
          <div
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-[7px] border",
              toneClasses,
            )}
          >
            {icon}
          </div>
          <div>
            <h2 className="m-0 flex items-center gap-2 text-[15px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-1)]">
              {title}
              {titleBadge && (
                <Badge tone={titleBadge.tone}>{titleBadge.label}</Badge>
              )}
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-[1.4] text-[var(--text-3)]">
              {description}
            </p>
          </div>
        </div>
        {headerAction && <div className="flex gap-2">{headerAction}</div>}
      </div>
      <div className="px-[22px] pb-[18px] pt-1">{children}</div>
    </section>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "amber" | "teal" | "green" | "blue";
}) {
  const tones = {
    amber:
      "bg-[rgba(245,158,11,0.12)] text-[var(--semantic-amber)] border-[rgba(245,158,11,0.18)]",
    teal: "bg-[var(--teal-subtle)] text-[var(--teal-text)] border-[rgba(0,212,170,0.14)]",
    green:
      "bg-[rgba(16,185,129,0.1)] text-[var(--semantic-green)] border-[rgba(16,185,129,0.2)]",
    blue: "bg-[rgba(99,102,241,0.1)] text-[#818cf8] border-[rgba(99,102,241,0.2)]",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[3px] border px-[7px] py-[2px] text-[10px] font-semibold uppercase tracking-[0.05em]",
        tones,
      )}
    >
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  chipLabel,
  on,
  onChange,
  rightSlot,
}: {
  label: string;
  description: string;
  chipLabel?: string;
  on?: boolean;
  onChange?: (v: boolean) => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-[rgba(255,255,255,0.035)] py-3.5 last:border-b-0">
      <div className="flex-1">
        <div className="flex items-center gap-2 text-[13.5px] font-medium leading-[1.3] tracking-[-0.005em] text-[var(--text-1)]">
          {label}
          {chipLabel && (
            <span className="inline-flex items-center rounded-[3px] border border-[rgba(0,212,170,0.14)] bg-[var(--teal-subtle)] px-1.5 py-[1px] text-[9px] font-semibold uppercase leading-[1.4] tracking-[0.06em] text-[var(--teal-text)]">
              {chipLabel}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[12px] leading-[1.5] text-[var(--text-3)]">
          {description}
        </div>
      </div>
      {rightSlot ?? (
        <button
          type="button"
          role="switch"
          aria-checked={on ? "true" : "false"}
          aria-label={label}
          onClick={() => onChange?.(!on)}
          className={cn("sv2-switch", on && "sv2-switch-on")}
        />
      )}
    </div>
  );
}

function IdRow({
  label,
  icon: Icon,
  value,
  valueSuffix,
  onCopy,
  copyHint,
  badge,
  noMono,
}: {
  label: string;
  icon: typeof User;
  value: string;
  valueSuffix?: string;
  onCopy?: () => void;
  copyHint?: string;
  badge?: { label: string; tone: "green" | "blue" };
  noMono?: boolean;
}) {
  const badgeTones = {
    green:
      "bg-[rgba(16,185,129,0.1)] text-[var(--semantic-green)] border-[rgba(16,185,129,0.2)]",
    blue: "bg-[rgba(99,102,241,0.1)] text-[#818cf8] border-[rgba(99,102,241,0.2)]",
  };
  return (
    <div
      className={cn(
        "sv2-id-row rounded-md border border-[var(--border)] bg-[var(--bg-2)] px-3 py-2.5",
        onCopy && "cursor-pointer",
      )}
      onClick={onCopy}
      role={onCopy ? "button" : undefined}
      tabIndex={onCopy ? 0 : undefined}
      onKeyDown={
        onCopy
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCopy();
              }
            }
          : undefined
      }
    >
      <div className="mb-[3px] flex items-center gap-[5px] text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-4)]">
        <Icon className="h-[11px] w-[11px]" />
        {label}
      </div>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 break-all text-[12px] text-[var(--text-2)]",
          !noMono && "font-mono",
        )}
      >
        <span>{value}</span>
        {valueSuffix && (
          <span className="font-mono text-[10.5px] text-[var(--text-4)]">
            · {valueSuffix}
          </span>
        )}
        {badge && (
          <span
            className={cn(
              "inline-flex items-center rounded-[3px] border px-[7px] py-[1px] text-[10px] font-semibold uppercase tracking-[0.05em]",
              badgeTones[badge.tone],
            )}
          >
            {badge.label}
          </span>
        )}
        {onCopy && copyHint && (
          <span className="sv2-copy-trail text-[10px] text-[var(--text-4)]">
            · {copyHint}
          </span>
        )}
      </div>
    </div>
  );
}

function ThemeCard({
  value,
  label,
  selected,
  onClick,
}: {
  value: Theme;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const previewClass = {
    dark: "bg-[#0a0d14]",
    light: "bg-[#f5f4f2]",
    system: "bg-[linear-gradient(135deg,#0a0d14_50%,#f5f4f2_50%)]",
  }[value];
  const barClass = {
    dark: "bg-[rgba(255,255,255,0.06)]",
    light: "bg-[rgba(0,0,0,0.08)]",
    system: "bg-[rgba(128,128,128,0.2)]",
  }[value];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "sv2-theme-card relative overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-2)] cursor-pointer",
        selected && "sv2-theme-card-selected",
      )}
    >
      <div
        className={cn(
          "flex h-[72px] flex-col gap-[5px] px-2.5 pt-2.5",
          previewClass,
        )}
      >
        <div className="h-[5px] w-[40%] rounded-[3px] bg-[var(--teal)]" />
        <div className={cn("h-[5px] rounded-[3px]", barClass)} />
        <div className={cn("h-[5px] rounded-[3px]", barClass)} />
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-1)] px-3 py-2.5">
        <span className="text-[12.5px] font-medium text-[var(--text-1)]">
          {label}
        </span>
        <span
          className={cn(
            "relative h-[14px] w-[14px] rounded-full border-[1.4px] border-[var(--border-strong)]",
            selected && "border-[var(--teal)] bg-[var(--teal)]",
          )}
        >
          {selected && (
            <span
              aria-hidden="true"
              className="absolute inset-[3px] rounded-full bg-[#032921]"
            />
          )}
        </span>
      </div>
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={cn(
        "grid h-[26px] w-[26px] place-items-center rounded-[5px] border border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-3)] transition-all disabled:cursor-not-allowed disabled:opacity-60",
        !disabled &&
          (danger
            ? "hover:border-[rgba(244,63,94,0.3)] hover:bg-[rgba(244,63,94,0.08)] hover:text-[var(--semantic-red)]"
            : "hover:border-[rgba(0,212,170,0.18)] hover:bg-[var(--teal-subtle)] hover:text-[var(--teal-text)]"),
      )}
    >
      {children}
    </button>
  );
}

function DangerRow({
  label,
  labelBadge,
  description,
  onClick,
  icon: Icon,
  cta,
  disabled,
}: {
  label: string;
  labelBadge?: { label: string; tone: "amber" };
  description: string;
  onClick: () => void;
  icon?: typeof LogOut;
  cta: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-[rgba(255,255,255,0.035)] py-3.5 last:border-b-0">
      <div className="flex-1">
        <div className="flex items-center gap-2 text-[13.5px] font-medium leading-[1.3] tracking-[-0.005em] text-[var(--text-1)]">
          {label}
          {labelBadge && (
            <Badge tone={labelBadge.tone}>{labelBadge.label}</Badge>
          )}
        </div>
        <div className="mt-0.5 text-[12px] leading-[1.5] text-[var(--text-3)]">
          {description}
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="sv2-danger-btn inline-flex items-center gap-1.5 rounded-md border border-[rgba(244,63,94,0.24)] bg-[rgba(244,63,94,0.06)] px-3.5 py-[7px] text-[12.5px] font-medium text-[var(--semantic-red)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {Icon && <Icon className="h-[13px] w-[13px]" />}
        {cta}
      </button>
    </div>
  );
}

// Suppress unused imports reserved for future expansion
void Check;
void CircleAlert;
void Sparkles;
