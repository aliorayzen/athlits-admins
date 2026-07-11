"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getApiErrorMessage,
  getApiErrorStatus,
  getRestorableCustomers,
  restoreCustomer,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PageResponse, RestorableCustomerDto } from "@/types/api";

const PAGE_SIZE = 20;
const SORTS = [
  { key: "deadline", label: "Deadline", param: "permanentDeletionAt,asc" },
  { key: "requested", label: "Requested", param: "deletionRequestedAt,desc" },
] as const;

type Phase = "loading" | "error" | "ready";
type SortKey = (typeof SORTS)[number]["key"];

function useDebounced(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);
  return debounced;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function timeRemaining(value: string): string {
  const milliseconds = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "Expiring now";
  const hours = Math.ceil(milliseconds / 3_600_000);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} left`;
  const days = Math.ceil(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} left`;
}

function initials(customer: RestorableCustomerDto): string {
  return (
    `${customer.firstName?.[0] ?? ""}${customer.lastName?.[0] ?? ""}`.toUpperCase() ||
    "U"
  );
}

export function RestorableAccountsDirectory() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] =
    useState<PageResponse<RestorableCustomerDto> | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("deadline");
  const [page, setPage] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const debouncedSearch = useDebounced(search.trim(), 300);
  const requestSequence = useRef(0);
  const hasLoaded = useRef(false);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    const sortParam = SORTS.find((option) => option.key === sort)?.param;

    async function load() {
      setIsFetching(true);
      if (!hasLoaded.current) setPhase("loading");
      try {
        const result = await getRestorableCustomers({
          search: debouncedSearch || undefined,
          page,
          size: PAGE_SIZE,
          sort: sortParam,
        });
        if (sequence !== requestSequence.current) return;
        setData(result);
        setErrorMessage("");
        setPhase("ready");
        hasLoaded.current = true;
      } catch (error: unknown) {
        if (sequence !== requestSequence.current) return;
        const message = getApiErrorMessage(
          error,
          "Couldn't load restorable accounts. Check your connection and try again.",
        );
        setErrorMessage(message);
        if (!hasLoaded.current) setPhase("error");
        else toast.error(message);
      } finally {
        if (sequence === requestSequence.current) setIsFetching(false);
      }
    }

    void load();
  }, [debouncedSearch, page, reloadToken, sort]);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(0);
  }

  function updateSort(value: SortKey) {
    setSort(value);
    setPage(0);
  }

  function removeRestored(customerId: string) {
    const moveToPreviousPage = page > 0 && data?.content.length === 1;
    setData((current) => {
      if (!current) return current;
      const content = current.content.filter(
        (customer) => customer.id !== customerId,
      );
      const totalElements = Math.max(0, current.totalElements - 1);
      return {
        ...current,
        content,
        numberOfElements: content.length,
        totalElements,
        totalPages: Math.ceil(totalElements / current.size),
        empty: content.length === 0,
      };
    });
    if (moveToPreviousPage) setPage((current) => Math.max(0, current - 1));
    else reload();
  }

  return (
    <div className="users-v2 space-y-5">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
            Restorable Accounts
          </h1>
          {phase === "ready" && (
            <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-1)] px-2 py-[2px] font-mono text-[11px] font-medium tabular-nums text-[var(--text-3)]">
              {data?.totalElements ?? 0}
            </span>
          )}
        </div>
        <p className="text-[13px] text-[var(--text-3)]">
          Customer accounts that can still be reactivated before permanent
          deletion
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2">
          <ArrowDownUp className="h-3.5 w-3.5 text-[var(--text-4)]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
            Sort
          </span>
          <div className="inline-flex items-center gap-[2px] rounded-md border border-[var(--border)] bg-[var(--bg-1)] p-[2px]">
            {SORTS.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={sort === option.key}
                disabled={phase === "error"}
                onClick={() => updateSort(option.key)}
                className={cn(
                  "rounded px-2.5 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50",
                  sort === option.key
                    ? "bg-[var(--teal-subtle)] text-[var(--teal-text)]"
                    : "text-[var(--text-3)] hover:text-[var(--text-1)]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full sm:max-w-[340px]">
          <Search className="pointer-events-none absolute left-[11px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[var(--text-4)]" />
          <input
            type="search"
            aria-label="Search restorable accounts"
            placeholder="Search name, email, or phone..."
            value={search}
            disabled={phase === "error"}
            onChange={(event) => updateSearch(event.target.value)}
            className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-1)] pl-[34px] pr-3 text-[12.5px] text-[var(--text-1)] outline-none transition-all placeholder:text-[var(--text-4)] focus:border-[var(--teal)] focus:shadow-[0_0_0_3px_var(--teal-subtle)] disabled:opacity-50"
          />
        </div>
      </div>

      {phase === "loading" && <DirectorySkeleton />}
      {phase === "error" && (
        <ErrorState
          message={errorMessage}
          onRetry={() => {
            hasLoaded.current = false;
            reload();
          }}
        />
      )}
      {phase === "ready" && (
        <DirectoryBody
          data={data}
          search={search}
          isFetching={isFetching}
          onClearSearch={() => updateSearch("")}
          onPageChange={setPage}
          onRestored={removeRestored}
          onRefresh={reload}
        />
      )}
    </div>
  );
}

function DirectoryBody({
  data,
  search,
  isFetching,
  onClearSearch,
  onPageChange,
  onRestored,
  onRefresh,
}: {
  data: PageResponse<RestorableCustomerDto> | null;
  search: string;
  isFetching: boolean;
  onClearSearch: () => void;
  onPageChange: (page: number) => void;
  onRestored: (id: string) => void;
  onRefresh: () => void;
}) {
  const rows = data?.content ?? [];
  if (rows.length === 0) {
    const filtered = search.trim().length > 0;
    return (
      <div className="flex flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-2)]">
          {filtered ? (
            <Search className="h-6 w-6 text-[var(--text-4)]" />
          ) : (
            <UserRound className="h-6 w-6 text-[var(--text-4)]" />
          )}
        </div>
        <p className="text-base font-medium text-[var(--text-1)]">
          {filtered ? "No matching accounts" : "No accounts to restore"}
        </p>
        <p className="mt-1 max-w-sm text-sm text-[var(--text-3)]">
          {filtered
            ? "Try a different name, email address, or phone number."
            : "Customers inside the restoration window will appear here."}
        </p>
        {filtered && (
          <Button
            variant="outline"
            onClick={onClearSearch}
            className="mt-4 border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-2)]"
          >
            Clear search
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)] transition-opacity",
        isFetching && "opacity-60",
      )}
      aria-busy={isFetching}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-separate border-spacing-0">
          <thead className="bg-white/[0.012]">
            <tr>
              <Th className="pl-4">Customer</Th>
              <Th>Phone</Th>
              <Th>Deletion requested</Th>
              <Th>Permanent deletion</Th>
              <Th className="pr-4 text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                onRestored={onRestored}
                onRefresh={onRefresh}
              />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        data={data}
        isFetching={isFetching}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function CustomerRow({
  customer,
  onRestored,
  onRefresh,
}: {
  customer: RestorableCustomerDto;
  onRestored: (id: string) => void;
  onRefresh: () => void;
}) {
  const fullName =
    `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() ||
    "Unnamed customer";
  return (
    <tr className="group transition-colors hover:bg-white/[0.015]">
      <td className="border-t border-white/[0.035] px-4 py-3">
        <div className="flex min-w-[240px] items-center gap-2.5">
          <Avatar className="h-9 w-9 border border-[rgba(0,212,170,0.16)]">
            {customer.profilePictureUrl && (
              <AvatarImage src={customer.profilePictureUrl} alt="" />
            )}
            <AvatarFallback className="bg-[var(--teal-subtle)] text-[11px] font-semibold text-[var(--teal-text)]">
              {initials(customer)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-px">
            <span className="truncate text-[13.5px] font-medium text-[var(--text-1)]">
              {fullName}
            </span>
            <span className="truncate font-mono text-[11px] text-[var(--text-4)]">
              {customer.email}
            </span>
          </div>
        </div>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3">
        {customer.phoneNumber ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-[var(--text-2)]">
            <Phone className="h-[11px] w-[11px] text-[var(--text-4)]" />
            {customer.phoneNumber}
          </span>
        ) : (
          <span className="text-[12px] text-[var(--text-4)]">Not provided</span>
        )}
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3">
        <DateCell icon={Trash2} value={customer.deletionRequestedAt} />
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3">
        <div className="flex flex-col gap-px whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--semantic-amber)]">
            <CalendarClock className="h-3 w-3" />
            {timeRemaining(customer.permanentDeletionAt)}
          </span>
          <span className="font-mono text-[10.5px] text-[var(--text-4)]">
            {formatDateTime(customer.permanentDeletionAt)}
          </span>
        </div>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 text-right">
        <RestoreDialog
          customer={customer}
          onRestored={onRestored}
          onRefresh={onRefresh}
        />
      </td>
    </tr>
  );
}

function DateCell({
  icon: Icon,
  value,
}: {
  icon: typeof Trash2;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] text-[var(--text-3)]">
      <Icon className="h-3 w-3 text-[var(--text-4)]" />
      {formatDateTime(value)}
    </span>
  );
}

function RestoreDialog({
  customer,
  onRestored,
  onRefresh,
}: {
  customer: RestorableCustomerDto;
  onRestored: (id: string) => void;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const name = `${customer.firstName} ${customer.lastName}`.trim();

  async function handleRestore() {
    setIsRestoring(true);
    try {
      await restoreCustomer(customer.id);
      onRestored(customer.id);
      setOpen(false);
      toast.success(`${name || customer.email} restored`);
    } catch (error: unknown) {
      const expired = getApiErrorStatus(error) === 409;
      toast.error(
        getApiErrorMessage(
          error,
          "Couldn't restore this account. Please try again.",
        ),
      );
      if (expired) {
        setOpen(false);
        onRefresh();
      }
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !isRestoring && setOpen(next)}
    >
      <DialogTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(0,212,170,0.25)] bg-[var(--teal-subtle)] px-2.5 py-[5px] text-[12px] font-medium text-[var(--teal-text)] transition-colors hover:bg-[rgba(0,212,170,0.15)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--teal-subtle)]"
          >
            <RotateCcw className="h-[13px] w-[13px]" />
            Restore
          </button>
        )}
      />
      <DialogContent className="border-[var(--border)] bg-[var(--bg-1)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-1)]">
            Restore this customer account?
          </DialogTitle>
          <DialogDescription className="text-[var(--text-3)]">
            <span className="font-medium text-[var(--text-2)]">
              {name || customer.email}
            </span>{" "}
            will regain access immediately. Their pending permanent deletion
            will be cancelled.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-[var(--border)] bg-[var(--bg-2)] px-3 py-2.5">
          <p className="font-mono text-[11px] text-[var(--text-3)]">
            {customer.email}
          </p>
          <p className="mt-1 text-[11px] text-[var(--semantic-amber)]">
            Restore before {formatDateTime(customer.permanentDeletionAt)}
          </p>
        </div>
        <DialogFooter className="border-[var(--border)] bg-white/[0.008]">
          <Button
            type="button"
            variant="outline"
            disabled={isRestoring}
            onClick={() => setOpen(false)}
            className="border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-2)]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isRestoring}
            onClick={handleRestore}
            className="gap-1.5 border border-[rgba(0,212,170,0.3)] bg-[linear-gradient(135deg,#00d4aa_0%,#00b894_100%)] font-semibold text-[#032921] shadow-[0_0_20px_-6px_rgba(0,212,170,0.35)]"
          >
            {isRestoring ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            {isRestoring ? "Restoring..." : "Restore account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b border-[var(--border)] px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Pagination({
  data,
  isFetching,
  onPageChange,
}: {
  data: PageResponse<RestorableCustomerDto> | null;
  isFetching: boolean;
  onPageChange: (page: number) => void;
}) {
  if (!data) return null;
  const current = data.number;
  const totalPages = Math.max(1, data.totalPages);
  const count = data.numberOfElements ?? data.content.length;
  const start = data.totalElements === 0 ? 0 : current * data.size + 1;
  const end = current * data.size + count;
  return (
    <div className="flex flex-col gap-2 border-t border-[var(--border)] bg-white/[0.008] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-mono text-[12px] tabular-nums text-[var(--text-4)]">
        Showing {start}-{end} of {data.totalElements}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <PageButton
            label="Previous page"
            disabled={isFetching || current === 0}
            onClick={() => onPageChange(current - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </PageButton>
          <span className="px-2 font-mono text-[11px] tabular-nums text-[var(--text-3)]">
            Page {current + 1} of {totalPages}
          </span>
          <PageButton
            label="Next page"
            disabled={isFetching || current + 1 >= totalPages}
            onClick={() => onPageChange(current + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </PageButton>
        </div>
      )}
    </div>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-1)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function DirectorySkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-white/[0.035] px-4 py-3 last:border-b-0"
        >
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(244,63,94,0.25)] bg-[var(--semantic-red-subtle)]">
        <AlertTriangle className="h-6 w-6 text-[var(--semantic-red)]" />
      </div>
      <p className="text-base font-medium text-[var(--text-1)]">
        Couldn&apos;t load restorable accounts
      </p>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--text-3)]">
        {message}
      </p>
      <Button
        variant="outline"
        onClick={onRetry}
        className="mt-5 gap-1.5 border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-2)]"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </Button>
    </div>
  );
}
