"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PlayerReportItem, PlayerSortBy } from "@/types/api";

import { PlayerBookingHistory } from "./player-booking-history";
import {
  countPlayerFilters,
  PlayerReportFiltersPanel,
} from "./player-report-filters";
import {
  formatDate,
  MoneyList,
  Pagination,
  StatusPill,
} from "./player-report-primitives";
import { usePlayersReport } from "./use-players-report";

const SORT_OPTIONS: { value: PlayerSortBy; label: string }[] = [
  { value: "LAST_BOOKING_DATE", label: "Last booking" },
  { value: "NAME", label: "Name" },
  { value: "EMAIL", label: "Email" },
  { value: "REGISTRATION_DATE", label: "Registration date" },
  { value: "TOTAL_RESERVATIONS", label: "Total reservations" },
  { value: "PAID_RESERVATIONS", label: "Paid reservations" },
];

/** Platform-admin player reporting with server filters and grouped history. */
export function PlayersDirectory() {
  const report = usePlayersReport();
  const [selectedPlayer, setSelectedPlayer] =
    useState<PlayerReportItem | null>(null);
  const rows = report.data?.content ?? [];
  const visibleSelection = selectedPlayer
    ? rows.find((player) => player.playerId === selectedPlayer.playerId) ?? null
    : null;

  return (
    <div className="players-report-v2 space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
              Players
            </h1>
            {report.data && (
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg-1)] px-2 py-[2px] font-mono text-[11px] font-medium tabular-nums text-[var(--text-3)]">
                {report.data.totalElements}
              </span>
            )}
          </div>
          <p className="text-[13px] tracking-[-0.003em] text-[var(--text-3)]">
            Review player activity, payments, and grouped booking history.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={report.isFetching}
          onClick={report.retry}
          className="h-8 gap-1.5 border-[var(--border)] bg-[var(--bg-1)] px-3 text-[12px] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", report.isFetching && "animate-spin")}
          />
          Refresh
        </Button>
      </header>

      <section aria-label="Player directory controls" className="space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <PlayerReportFiltersPanel
              value={report.filters}
              onApply={report.setFilters}
            />
            <label htmlFor="player-sort" className="sr-only">
              Sort players
            </label>
            <select
              id="player-sort"
              value={report.sortBy}
              disabled={report.isLoading}
              onChange={(event) =>
                report.setSortBy(event.target.value as PlayerSortBy)
              }
              className="h-8 rounded-md border border-[var(--border)] bg-[var(--bg-1)] px-2.5 text-[12px] text-[var(--text-2)] outline-none focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)] disabled:opacity-50"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={report.isLoading}
              aria-label={
                report.direction === "DESC"
                  ? "Change to ascending order"
                  : "Change to descending order"
              }
              title={report.direction === "DESC" ? "Descending" : "Ascending"}
              onClick={report.toggleDirection}
              className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-3)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] disabled:opacity-50"
            >
              {report.direction === "DESC" ? (
                <ArrowDown className="h-3.5 w-3.5" />
              ) : (
                <ArrowUp className="h-3.5 w-3.5" />
              )}
            </button>
            {report.isFetching && !report.isLoading && (
              <span
                aria-live="polite"
                className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-4)]"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating
              </span>
            )}
          </div>

          <div className="relative w-full xl:max-w-[340px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-4)]" />
            <input
              type="search"
              aria-label="Search players by name or email"
              placeholder="Search name or email…"
              value={report.search}
              onChange={(event) => report.setSearch(event.target.value)}
              className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg-1)] pl-9 pr-3 text-[12.5px] text-[var(--text-1)] outline-none placeholder:text-[var(--text-4)] focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]"
            />
          </div>
        </div>
      </section>

      {report.error && report.data && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-[rgba(245,158,11,0.2)] bg-[var(--semantic-amber-subtle)] px-4 py-3"
        >
          <span className="flex min-w-0 items-center gap-2 text-[12px] text-[var(--text-2)]">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--semantic-amber)]" />
            <span className="truncate">{report.error}</span>
          </span>
          <button
            type="button"
            onClick={report.retry}
            className="shrink-0 text-[12px] font-medium text-[var(--semantic-amber)] hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      <PlayersBody
        rows={rows}
        data={report.data}
        error={report.error}
        isLoading={report.isLoading}
        isFetching={report.isFetching}
        hasFilters={
          countPlayerFilters(report.filters) > 0 || report.search.trim() !== ""
        }
        selectedId={visibleSelection?.playerId ?? null}
        onSelect={setSelectedPlayer}
        onClear={() => {
          report.setSearch("");
          report.setFilters({
            accountStatus: [],
            registeredFrom: "",
            registeredTo: "",
            reservationStatus: [],
            paid: "",
          });
        }}
        onRetry={report.retry}
        onPage={report.goToPage}
      />

      {visibleSelection && (
        <PlayerBookingHistory
          key={visibleSelection.playerId}
          player={visibleSelection}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}

function PlayersBody({
  rows,
  data,
  error,
  isLoading,
  isFetching,
  hasFilters,
  selectedId,
  onSelect,
  onClear,
  onRetry,
  onPage,
}: {
  rows: PlayerReportItem[];
  data: ReturnType<typeof usePlayersReport>["data"];
  error: string;
  isLoading: boolean;
  isFetching: boolean;
  hasFilters: boolean;
  selectedId: string | null;
  onSelect: (player: PlayerReportItem) => void;
  onClear: () => void;
  onRetry: () => void;
  onPage: (page: number) => void;
}) {
  if (isLoading) return <PlayersSkeleton />;

  if (error && !data) {
    return (
      <div className="grid min-h-64 place-items-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] px-6 text-center">
        <div>
          <AlertTriangle className="mx-auto h-6 w-6 text-[var(--semantic-red)]" />
          <h2 className="mt-3 text-[14px] font-semibold text-[var(--text-1)]">
            Player reporting is unavailable
          </h2>
          <p className="mt-1 max-w-md text-[12px] text-[var(--text-3)]">
            {error}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="mt-4 h-8 border-[var(--border)] bg-[var(--bg-2)] text-[12px]"
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!data || rows.length === 0) {
    return (
      <div className="grid min-h-64 place-items-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] px-6 text-center">
        <div>
          <UsersRound className="mx-auto h-6 w-6 text-[var(--text-4)]" />
          <h2 className="mt-3 text-[14px] font-semibold text-[var(--text-1)]">
            {hasFilters ? "No players match these filters" : "No players yet"}
          </h2>
          <p className="mt-1 text-[12px] text-[var(--text-3)]">
            {hasFilters
              ? "Clear or adjust the filters to widen the result set."
              : "Players appear here after they register on the platform."}
          </p>
          {hasFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={onClear}
              className="mt-4 h-8 border-[var(--border)] bg-[var(--bg-2)] text-[12px]"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      aria-busy={isFetching}
      className={cn(
        "overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)] transition-opacity",
        isFetching && "opacity-60",
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-separate border-spacing-0">
          <thead className="bg-white/[0.012]">
            <tr>
              {["Player", "Account", "Reservations", "Paid", "Net paid", "Last booking", ""].map(
                (heading, index) => (
                  <th
                    key={`${heading}-${index}`}
                    className="border-b border-[var(--border)] px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((player) => (
              <PlayerRow
                key={player.playerId}
                player={player}
                selected={selectedId === player.playerId}
                onSelect={() => onSelect(player)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination data={data} disabled={isFetching} onPage={onPage} />
    </div>
  );
}

function PlayerRow({
  player,
  selected,
  onSelect,
}: {
  player: PlayerReportItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const fullName =
    `${player.firstName} ${player.lastName}`.trim() || "Unnamed player";
  const statusSummary = [
    player.confirmedReservations > 0 &&
      `${player.confirmedReservations} confirmed`,
    player.completedReservations > 0 &&
      `${player.completedReservations} completed`,
    player.cancelledReservations > 0 &&
      `${player.cancelledReservations} cancelled`,
    player.noShowReservations > 0 && `${player.noShowReservations} no-show`,
  ].filter(Boolean);

  return (
    <tr
      className={cn(
        "group hover:bg-white/[0.015]",
        selected && "bg-[var(--teal-subtle)]",
      )}
    >
      <td className="border-t border-white/[0.035] px-4 py-3 align-top">
        <div className="min-w-56 text-[13px] font-medium text-[var(--text-1)]">
          {fullName}
        </div>
        <div className="mt-0.5 font-mono text-[10.5px] text-[var(--text-4)]">
          {player.email}
        </div>
        <div className="mt-0.5 flex gap-2 font-mono text-[9.5px] text-[var(--text-4)]">
          <span>#{player.playerId}</span>
          {player.phoneNumber && <span>{player.phoneNumber}</span>}
        </div>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 align-top">
        <StatusPill status={player.accountStatus} />
        <div className="mt-1.5 text-[10.5px] text-[var(--text-4)]">
          Registered {formatDate(player.registrationDate)}
        </div>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 align-top">
        <div className="font-mono text-[14px] font-semibold tabular-nums text-[var(--text-2)]">
          {player.totalReservations}
        </div>
        <div className="mt-0.5 max-w-52 text-[10px] text-[var(--text-4)]">
          {statusSummary.join(" · ") || "No status activity"}
        </div>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 align-top">
        <div className="font-mono text-[14px] font-semibold tabular-nums text-[var(--semantic-green)]">
          {player.paidReservations}
        </div>
        <div className="mt-0.5 text-[10px] text-[var(--text-4)]">
          reservations
        </div>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 align-top">
        <MoneyList amounts={player.netPaid} empty="No net payments" />
        {player.grossPaid.length > 0 && (
          <div className="mt-1 border-t border-[var(--border)] pt-1">
            <span className="text-[9px] uppercase tracking-[0.07em] text-[var(--text-4)]">
              Gross
            </span>
            <MoneyList amounts={player.grossPaid} muted />
          </div>
        )}
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 align-top">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-[var(--text-2)]">
          <CalendarClock className="h-3.5 w-3.5 text-[var(--text-4)]" />
          {formatDate(player.lastBookingDate)}
        </span>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 text-right align-middle">
        <button
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[11.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]",
            selected
              ? "border-[rgba(0,212,170,0.2)] bg-[var(--teal-subtle)] text-[var(--teal-text)]"
              : "border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)]",
          )}
        >
          History
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform",
              selected && "rotate-90",
            )}
          />
        </button>
      </td>
    </tr>
  );
}

function PlayersSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <Skeleton className="h-3 w-72 bg-[var(--bg-2)]" />
      </div>
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[1.6fr_1fr_1fr_0.7fr_1fr_0.9fr] gap-5 border-b border-white/[0.035] px-4 py-4 last:border-0"
        >
          {Array.from({ length: 6 }).map((__, cell) => (
            <Skeleton
              key={cell}
              className="h-4 bg-[var(--bg-2)]"
              style={{ width: `${65 + ((index + cell) % 4) * 9}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
