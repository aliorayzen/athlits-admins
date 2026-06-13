"use client";

import { Bell } from "lucide-react";

import { MobileNav } from "./sidebar";
import { NotificationsPopover } from "./notifications-popover";
import { useAuth } from "@/context/auth-context";
import { getDisplayName, getInitials } from "@/lib/user-display";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function TopBar() {
  const { user } = useAuth();

  const initials = getInitials(user);
  const displayName = getDisplayName(user);
  // Only show the email line when it adds info beyond the name (i.e. the name
  // isn't itself just the email fallback).
  const secondaryEmail =
    user?.email && user.email !== displayName ? user.email : null;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-0)]/80 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell — opens NotificationsPopover */}
        <NotificationsPopover
          renderTrigger={(props, { highPriorityCount }) => (
            <button
              {...props}
              type="button"
              aria-label={
                highPriorityCount > 0
                  ? `Notifications - ${highPriorityCount} overdue payment alerts`
                  : "Notifications"
              }
              title="Notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-4)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-2)] data-[popup-open]:bg-[var(--bg-hover)] data-[popup-open]:text-[var(--text-1)]"
            >
              <Bell className="h-4 w-4" />
              {highPriorityCount > 0 && (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[var(--semantic-red)] px-1 text-[9px] font-bold leading-none text-white shadow-[0_0_10px_rgba(244,63,94,0.55)]"
                  >
                    {highPriorityCount > 9 ? "9+" : highPriorityCount}
                  </span>
                </>
              )}
            </button>
          )}
        />

        <div className="h-5 w-px bg-[var(--border)]" />

        <div className="flex items-center gap-2.5">
          <div className="hidden flex-col items-end leading-tight sm:flex">
            <span className="text-sm font-medium text-[var(--text-2)]">
              {displayName}
            </span>
            {secondaryEmail && (
              <span className="text-[11px] text-[var(--text-4)]">
                {secondaryEmail}
              </span>
            )}
          </div>
          <Avatar className="h-8 w-8 ring-1 ring-[rgba(0,212,170,0.2)]">
            <AvatarFallback className="bg-[linear-gradient(135deg,rgba(0,212,170,0.15),rgba(0,212,170,0.05))] text-xs font-medium text-[var(--teal-text)]">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
