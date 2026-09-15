"use client";
/* eslint-disable react-hooks/set-state-in-effect -- remote page changes intentionally enter loading state before fetching */

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api";
import { discountsApi } from "@/lib/discounts-api";
import type {
  PromotionRedemption,
  VenueDiscountKind,
  VenueDiscountRequest,
  VenueDiscountResponse,
  VenuePromotionResponse,
} from "@/types/admin-operations";
import type { VenueDetailResponse } from "@/types/api";

const FIELD =
  "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-1)] focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]";

export function VenueDiscounts({ venue }: { venue: VenueDetailResponse }) {
  const [discounts, setDiscounts] = useState<VenueDiscountResponse[]>([]);
  const [promotions, setPromotions] = useState<VenuePromotionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      discountsApi.list(venue.id, controller.signal),
      discountsApi.listPromotions(venue.id, controller.signal),
    ]).then(
      ([nextDiscounts, nextPromotions]) => {
        if (!controller.signal.aborted) {
          setDiscounts(nextDiscounts);
          setPromotions(nextPromotions);
          setLoading(false);
        }
      },
      (caught: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            getApiErrorMessage(
              caught,
              "Discounts and promotions could not be loaded.",
            ),
          );
          setLoading(false);
        }
      },
    );
    return () => controller.abort();
  }, [revision, venue.id]);
  function reload() {
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  }
  if (loading) return <Skeleton className="h-80 rounded-2xl" />;
  if (error)
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-5">
        <p role="alert" className="text-sm text-[var(--red-text)]">
          {error}
        </p>
        <Button variant="outline" className="mt-3" onClick={reload}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </section>
    );
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--text-1)]">
            Discounts and promotion usage
          </h2>
          <p className="text-xs text-[var(--text-4)]">
            Automatic venue discounts are managed here; code redemption history
            is read-only.
          </p>
        </div>
        <DiscountEditor
          venue={venue}
          onSaved={(created) => setDiscounts([...discounts, created])}
        />
      </header>
      <div className="p-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
          Automatic discounts
        </h3>
        {discounts.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-4)]">
            No venue discounts.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-[var(--border)]">
            {discounts.map((discount) => (
              <DiscountRow
                key={discount.id}
                venue={venue}
                discount={discount}
                onUpdated={(value) =>
                  setDiscounts(
                    discounts.map((item) =>
                      item.id === value.id ? value : item,
                    ),
                  )
                }
                onDeleted={() =>
                  setDiscounts(
                    discounts.filter((item) => item.id !== discount.id),
                  )
                }
              />
            ))}
          </div>
        )}
        <h3 className="mt-7 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
          Promotion codes
        </h3>
        {promotions.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-4)]">
            No promotion codes with redemption history.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-[var(--border)]">
            {promotions.map((promotion) => (
              <div
                key={promotion.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-mono text-sm text-[var(--text-1)]">
                    {promotion.code}
                  </p>
                  <p className="text-xs text-[var(--text-4)]">
                    {promotion.redemptionCount} redemptions ·{" "}
                    {promotion.active ? "Active" : "Inactive"}
                  </p>
                </div>
                <RedemptionsDialog venueId={venue.id} promotion={promotion} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface DiscountDraft {
  titleEn: string;
  titleAr: string;
  kind: VenueDiscountKind;
  value: number;
  validFrom: string;
  validTo: string;
  courtIds: number[];
  active: boolean;
}
function draftFrom(discount?: VenueDiscountResponse): DiscountDraft {
  return {
    titleEn: discount?.titleEn ?? "",
    titleAr: discount?.titleAr ?? "",
    kind: discount?.kind ?? "PERCENT_OFF",
    value:
      discount?.kind === "FIXED_AMOUNT_OFF"
        ? (discount.amountOff ?? 1)
        : (discount?.percentOff ?? 10),
    validFrom: toLocalInput(discount?.validFrom),
    validTo: toLocalInput(discount?.validTo),
    courtIds: discount?.courts.map((court) => court.id) ?? [],
    active: discount?.active ?? true,
  };
}
function payloadFrom(
  draft: DiscountDraft,
  currencyCode: string,
): VenueDiscountRequest {
  return {
    titleEn: draft.titleEn.trim() || undefined,
    titleAr: draft.titleAr.trim() || undefined,
    kind: draft.kind,
    ...(draft.kind === "PERCENT_OFF"
      ? { percentOff: draft.value }
      : { amountOff: draft.value, currencyCode }),
    ...(draft.validFrom
      ? { validFrom: new Date(draft.validFrom).toISOString() }
      : {}),
    ...(draft.validTo
      ? { validTo: new Date(draft.validTo).toISOString() }
      : {}),
    courtIds: draft.courtIds,
    active: draft.active,
  };
}

function DiscountEditor({
  venue,
  discount,
  onSaved,
}: {
  venue: VenueDetailResponse;
  discount?: VenueDiscountResponse;
  onSaved: (discount: VenueDiscountResponse) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => draftFrom(discount));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  function update(patch: Partial<DiscountDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError("");
  }
  async function save() {
    if (
      draft.value <= 0 ||
      (draft.kind === "PERCENT_OFF" && draft.value > 99) ||
      (draft.validTo && draft.validFrom && draft.validTo <= draft.validFrom)
    ) {
      setError("Enter a valid value and date range.");
      return;
    }
    setPending(true);
    try {
      const payload = payloadFrom(draft, venue.currencyCode);
      const saved = discount
        ? await discountsApi.update(venue.id, String(discount.id), payload)
        : await discountsApi.create(venue.id, payload);
      onSaved(saved);
      setOpen(false);
      toast.success(discount ? "Discount updated" : "Discount created");
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Discount could not be saved."));
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          setDraft(draftFrom(discount));
          setError("");
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            size={discount ? "sm" : "default"}
            variant={discount ? "outline" : "default"}
          />
        }
      >
        {discount ? (
          "Edit"
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Add discount
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {discount ? "Edit discount" : "Create discount"}
          </DialogTitle>
          <DialogDescription>
            Leave all courts unchecked to apply venue-wide.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="English title">
            <Input
              maxLength={120}
              value={draft.titleEn}
              onChange={(e) => update({ titleEn: e.target.value })}
              className={FIELD}
            />
          </Field>
          <Field label="Arabic title">
            <Input
              maxLength={120}
              dir="rtl"
              value={draft.titleAr}
              onChange={(e) => update({ titleAr: e.target.value })}
              className={FIELD}
            />
          </Field>
          <Field label="Type">
            <select
              value={draft.kind}
              onChange={(e) =>
                update({ kind: e.target.value as VenueDiscountKind })
              }
              className={`h-9 rounded-md border px-3 text-sm ${FIELD}`}
            >
              <option value="PERCENT_OFF">Percent off</option>
              <option value="FIXED_AMOUNT_OFF">Fixed amount off</option>
            </select>
          </Field>
          <Field
            label={
              draft.kind === "PERCENT_OFF"
                ? "Percent"
                : `Amount (${venue.currencyCode})`
            }
          >
            <Input
              type="number"
              min={1}
              max={draft.kind === "PERCENT_OFF" ? 99 : undefined}
              value={draft.value}
              onChange={(e) => update({ value: Number(e.target.value) })}
              className={FIELD}
            />
          </Field>
          <Field label="Valid from">
            <Input
              type="datetime-local"
              value={draft.validFrom}
              onChange={(e) => update({ validFrom: e.target.value })}
              className={FIELD}
            />
          </Field>
          <Field label="Valid to">
            <Input
              type="datetime-local"
              value={draft.validTo}
              onChange={(e) => update({ validTo: e.target.value })}
              className={FIELD}
            />
          </Field>
          <div className="sm:col-span-2">
            <Label>Eligible courts</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {venue.courts.map((court) => {
                const id = Number(court.id);
                const selected = draft.courtIds.includes(id);
                return (
                  <button
                    type="button"
                    key={court.id}
                    aria-pressed={selected}
                    onClick={() =>
                      update({
                        courtIds: selected
                          ? draft.courtIds.filter((value) => value !== id)
                          : [...draft.courtIds, id],
                      })
                    }
                    className={`rounded-md border px-2.5 py-1.5 text-xs ${selected ? "border-[rgb(var(--teal-rgb)/0.3)] bg-[var(--teal-subtle)] text-[var(--teal-text)]" : "border-[var(--border)] text-[var(--text-3)]"}`}
                  >
                    {court.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-[var(--red-text)]">
            {error}
          </p>
        )}
        <Button disabled={pending} onClick={() => void save()}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Saving..." : "Save discount"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function DiscountRow({
  venue,
  discount,
  onUpdated,
  onDeleted,
}: {
  venue: VenueDetailResponse;
  discount: VenueDiscountResponse;
  onUpdated: (value: VenueDiscountResponse) => void;
  onDeleted: () => void;
}) {
  const [pending, setPending] = useState(false);
  async function remove() {
    setPending(true);
    try {
      await discountsApi.delete(venue.id, String(discount.id));
      onDeleted();
      toast.success("Discount deleted");
    } catch (caught) {
      toast.error(getApiErrorMessage(caught, "Discount could not be deleted."));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-medium text-[var(--text-1)]">
          {discount.titleEn || discount.titleAr || `Discount ${discount.id}`}
        </p>
        <p className="text-xs text-[var(--text-4)]">
          {discount.kind === "PERCENT_OFF"
            ? `${discount.percentOff}% off`
            : `${discount.amountOff} ${discount.currencyCode} off`}{" "}
          ·{" "}
          {discount.currentlyValid
            ? "Currently valid"
            : discount.active
              ? "Scheduled or expired"
              : "Inactive"}{" "}
          · {discount.courts.length || "All"} courts
        </p>
      </div>
      <div className="flex gap-2">
        <DiscountEditor venue={venue} discount={discount} onSaved={onUpdated} />
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                size="icon"
                variant="ghost"
                aria-label="Delete discount"
              />
            }
          >
            <Trash2 className="h-4 w-4 text-[var(--red-text)]" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete discount?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the automatic discount permanently.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={pending}
                className="bg-[var(--semantic-red)] text-[var(--bg-0)]"
                onClick={(e) => {
                  e.preventDefault();
                  void remove();
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function RedemptionsDialog({
  venueId,
  promotion,
}: {
  venueId: string;
  promotion: VenuePromotionResponse;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PromotionRedemption[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    discountsApi
      .redemptions(venueId, String(promotion.id), page, controller.signal)
      .then(
        (result) => {
          setRows(result.content);
          setTotalPages(result.totalPages);
          setLoading(false);
        },
        (caught) => {
          if (!controller.signal.aborted) {
            setError(
              getApiErrorMessage(caught, "Redemptions could not be loaded."),
            );
            setLoading(false);
          }
        },
      );
    return () => controller.abort();
  }, [open, page, promotion.id, venueId]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        View redemptions
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{promotion.code} redemptions</DialogTitle>
          <DialogDescription>
            Reservation, player, value and lifecycle status.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <Skeleton className="h-40" />
        ) : error ? (
          <p role="alert" className="text-sm text-[var(--red-text)]">
            {error}
          </p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--text-4)]">
            No redemptions on this page.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[var(--text-4)]">
                <tr>
                  <th className="py-2">Reservation</th>
                  <th>Player</th>
                  <th>Redeemed</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.reservationId}-${row.playerId}`}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="py-2 font-mono">{row.reservationId}</td>
                    <td className="font-mono">{row.playerId}</td>
                    <td>{new Date(row.redeemedAt).toLocaleString()}</td>
                    <td>
                      {row.discountAmount} {promotion.currencyCode}
                    </td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button
            size="icon"
            variant="outline"
            disabled={page === 0 || loading}
            onClick={() => setPage((value) => value - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-[var(--text-4)]">
            Page {page + 1} of {Math.max(1, totalPages)}
          </span>
          <Button
            size="icon"
            variant="outline"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => setPage((value) => value + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function toLocalInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
