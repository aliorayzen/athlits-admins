"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import {
  createAdminBooking,
  getApiErrorMessage,
  getApiErrorStatus,
  getBookableVenue,
  getVenues,
  previewAdminBooking,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  AdminBookingConflict,
  AdminBookingCreateResponse,
  AdminBookingOccurrencePreview,
  AdminBookingPreviewResponse,
  AdminBookingRequest,
  AdminCreatedBookingOccurrence,
  BookableCourtResponse,
  BookableCourtSportResponse,
  BookableVenueResponse,
  BookingOptionResponse,
  BookingPaymentMethod,
  VenueSummaryResponse,
} from "@/types/api";

type RecurrenceMode = "NONE" | "COUNT" | "END_DATE";
type FlowStep = "DETAILS" | "REVIEW" | "SUCCESS";

interface BookingDraft {
  venueId: string;
  courtId: string;
  courtSportId: string;
  bookingOptionId: string;
  bookingDate: string;
  startTime: string;
  playerName: string;
  playerPhoneE164: string;
  paymentMethod: BookingPaymentMethod;
  notes: string;
  recurrenceMode: RecurrenceMode;
  occurrences: string;
  endDate: string;
}

const EMPTY_DRAFT: BookingDraft = {
  venueId: "",
  courtId: "",
  courtSportId: "",
  bookingOptionId: "",
  bookingDate: "",
  startTime: "",
  playerName: "",
  playerPhoneE164: "",
  paymentMethod: "CASH",
  notes: "",
  recurrenceMode: "NONE",
  occurrences: "4",
  endDate: "",
};

const INPUT_CLASS =
  "h-10 border-[var(--border)] bg-[var(--bg-0)] px-3 text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-4)] focus-visible:border-[var(--teal)] focus-visible:ring-[3px] focus-visible:ring-[var(--teal-subtle)]";
const LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]";
const SELECT_CLASS =
  "h-10 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-3 pr-9 text-[13px] text-[var(--text-1)] outline-none transition-colors focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)] disabled:cursor-not-allowed disabled:opacity-50";

function localDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateValue: string, days: number): string {
  const date = dateValue
    ? new Date(`${dateValue}T12:00:00`)
    : new Date();
  date.setDate(date.getDate() + days);
  return localDateValue(date);
}

function formatDate(dateValue: string): string {
  if (!dateValue) return "Not set";
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));
}

function formatTime(value?: string | null): string {
  if (!value) return "—";
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const date = new Date(2000, 0, 1, hours, minutes);
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(amount: number | null | undefined, currency: string): string {
  if (amount == null) return "Unavailable";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function conflictMessage(
  conflict: AdminBookingConflict | string | null | undefined,
): string | null {
  if (!conflict) return null;
  if (typeof conflict === "string") return conflict;
  const message = conflict.message ?? conflict.reason ?? conflict.code;
  return typeof message === "string" && message.trim()
    ? message
    : "This occurrence is unavailable.";
}

function unknownConflictMessage(conflict: unknown): string {
  if (typeof conflict === "string" && conflict.trim()) return conflict;
  if (conflict && typeof conflict === "object") {
    const value = conflict as Record<string, unknown>;
    for (const key of ["message", "reason", "detail", "code"]) {
      if (typeof value[key] === "string" && value[key].trim()) {
        return value[key];
      }
    }
  }
  return "One or more requested occurrences are unavailable.";
}

function previewTotal(preview: AdminBookingPreviewResponse): number {
  const explicit = preview.totalPriceAmount ?? preview.totalAmount;
  if (explicit != null) return explicit;
  return preview.occurrences.reduce(
    (total, occurrence) => total + (occurrence.priceAmount ?? 0),
    0,
  );
}

function createdTotal(created: AdminBookingCreateResponse): number {
  const explicit = created.totalPriceAmount ?? created.totalAmount;
  if (explicit != null) return explicit;
  return created.occurrences.reduce(
    (total, occurrence) =>
      total + (occurrence.priceAmount ?? occurrence.totalAmount ?? 0),
    0,
  );
}

function sportLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return `${trimmed.startsWith("+") ? "+" : ""}${trimmed.replace(/\D/g, "")}`;
}

function SelectField({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
  children,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={LABEL_CLASS}>
        {label} <span className="text-[var(--semantic-red)]">*</span>
      </Label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={SELECT_CLASS}
          required
        >
          <option value="">{placeholder}</option>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-4)]" />
      </div>
      {hint && <p className="text-[11.5px] text-[var(--text-4)]">{hint}</p>}
    </div>
  );
}

function ContextValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <span className={LABEL_CLASS}>{label}</span>
      <div className="flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-2)] px-3 text-[13px] font-medium text-[var(--text-2)]">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--teal-text)]" />
        <span className="truncate">{value}</span>
      </div>
      <p className="text-[11.5px] text-[var(--text-4)]">
        Selected from the venue&apos;s court list
      </p>
    </div>
  );
}

function Section({
  number,
  icon: Icon,
  title,
  description,
  children,
}: {
  number: number;
  icon: typeof MapPin;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[var(--border)] px-5 py-6 last:border-b-0 sm:px-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[rgba(0,212,170,0.14)] bg-[var(--teal-subtle)] text-[var(--teal-text)]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="mb-0.5 flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold text-[var(--teal-text)]">
              {String(number).padStart(2, "0")}
            </span>
            <h2 className="text-[15px] font-semibold text-[var(--text-1)]">
              {title}
            </h2>
          </div>
          <p className="text-[12px] text-[var(--text-4)]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FlowIndicator({ step }: { step: FlowStep }) {
  const current = step === "DETAILS" ? 0 : step === "REVIEW" ? 1 : 2;
  return (
    <ol aria-label="Booking creation progress" className="flex items-center gap-2">
      {["Details", "Review", "Confirmed"].map((label, index) => (
        <li key={label} className="flex items-center gap-2">
          {index > 0 && <span className="h-px w-5 bg-[var(--border-strong)]" />}
          <span
            aria-current={index === current ? "step" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-medium",
              index <= current ? "text-[var(--text-2)]" : "text-[var(--text-4)]",
            )}
          >
            <span
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full border font-mono text-[9px]",
                index < current
                  ? "border-[var(--teal)] bg-[var(--teal)] text-[var(--bg-0)]"
                  : index === current
                    ? "border-[rgba(0,212,170,0.35)] bg-[var(--teal-subtle)] text-[var(--teal-text)]"
                    : "border-[var(--border)] text-[var(--text-4)]",
              )}
            >
              {index < current ? <Check className="h-3 w-3" /> : index + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function AdminBookingFlow({
  initialVenueId,
  initialCourtId,
  backHref,
}: {
  initialVenueId?: string;
  initialCourtId?: string;
  backHref?: string;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState<FlowStep>("DETAILS");
  const [draft, setDraft] = useState<BookingDraft>(() => ({
    ...EMPTY_DRAFT,
    venueId: initialVenueId ?? "",
    courtId: initialCourtId ?? "",
  }));
  const [venues, setVenues] = useState<VenueSummaryResponse[]>([]);
  const [bookableVenue, setBookableVenue] =
    useState<BookableVenueResponse | null>(null);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [loadingVenue, setLoadingVenue] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AdminBookingPreviewResponse | null>(null);
  const [reviewPayload, setReviewPayload] = useState<AdminBookingRequest | null>(
    null,
  );
  const [created, setCreated] = useState<AdminBookingCreateResponse | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const canWrite =
    user?.role === "ADMIN" &&
    (user.permissions === undefined || user.permissions.includes("BOOKINGS_WRITE"));

  const selectedVenue = venues.find((venue) => venue.id === draft.venueId);
  const courts = bookableVenue?.courts ?? [];
  const selectedCourt = courts.find((court) => court.id === draft.courtId);
  const sports = selectedCourt?.courtSports ?? [];
  const selectedSport = sports.find(
    (sport) => sport.id === draft.courtSportId,
  );
  const options = selectedSport?.bookingOptions.filter((option) => option.active) ?? [];
  const selectedOption = options.find(
    (option) => option.id === draft.bookingOptionId,
  );
  const cashSupported =
    selectedSport?.supportedPaymentMethods.includes("CASH") ?? false;

  const today = useMemo(() => localDateValue(new Date()), []);
  const latestBookingDate = bookableVenue
    ? addDays(today, bookableVenue.maxAdvanceBookingDays)
    : undefined;

  const setField = useCallback(
    <K extends keyof BookingDraft>(field: K, value: BookingDraft[K]) => {
      setDraft((current) => ({ ...current, [field]: value }));
      setReviewError(null);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingVenues(true);
    getVenues()
      .then((data) => {
        if (!cancelled) setVenues(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMetadataError(getApiErrorMessage(error, "Could not load venues."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingVenues(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedVenue || selectedVenue.status !== "ACTIVE") {
      setBookableVenue(null);
      return;
    }
    let cancelled = false;
    setLoadingVenue(true);
    setMetadataError(null);
    getBookableVenue(selectedVenue.slug)
      .then((data) => {
        if (cancelled) return;
        setBookableVenue(data);
        const court =
          data.courts.find((item) => item.id === initialCourtId) ??
          data.courts[0];
        const sport = court?.courtSports[0];
        const option =
          sport?.bookingOptions.find((item) => item.active && item.isDefault) ??
          sport?.bookingOptions.find((item) => item.active);
        const payment = sport?.supportedPaymentMethods[0] ?? "CASH";
        setDraft((current) => ({
          ...current,
          courtId: court?.id ?? "",
          courtSportId: sport?.id ?? "",
          bookingOptionId: option?.id ?? "",
          paymentMethod: payment,
          recurrenceMode:
            data.allowRecurringBookings && payment === "CASH"
              ? current.recurrenceMode
              : "NONE",
        }));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setBookableVenue(null);
          setMetadataError(
            getApiErrorMessage(
              error,
              "Could not load this venue's courts and session options.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingVenue(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialCourtId, selectedVenue]);

  function chooseVenue(venueId: string) {
    setBookableVenue(null);
    setMetadataError(null);
    setDraft((current) => ({
      ...current,
      venueId,
      courtId: "",
      courtSportId: "",
      bookingOptionId: "",
      recurrenceMode: "NONE",
      paymentMethod: "CASH",
    }));
  }

  function chooseCourt(courtId: string) {
    const court = courts.find((item) => item.id === courtId);
    const sport = court?.courtSports[0];
    const option =
      sport?.bookingOptions.find((item) => item.active && item.isDefault) ??
      sport?.bookingOptions.find((item) => item.active);
    setDraft((current) => ({
      ...current,
      courtId,
      courtSportId: sport?.id ?? "",
      bookingOptionId: option?.id ?? "",
      paymentMethod: sport?.supportedPaymentMethods[0] ?? "CASH",
      recurrenceMode: "NONE",
    }));
  }

  function chooseSport(courtSportId: string) {
    const sport = sports.find((item) => item.id === courtSportId);
    const option =
      sport?.bookingOptions.find((item) => item.active && item.isDefault) ??
      sport?.bookingOptions.find((item) => item.active);
    setDraft((current) => ({
      ...current,
      courtSportId,
      bookingOptionId: option?.id ?? "",
      paymentMethod: sport?.supportedPaymentMethods[0] ?? "CASH",
      recurrenceMode: "NONE",
    }));
  }

  function buildPayload(): AdminBookingRequest | null {
    if (!selectedVenue || selectedVenue.status !== "ACTIVE") {
      toast.error("Choose an active venue.");
      return null;
    }
    if (!selectedCourt || !selectedSport || !selectedOption) {
      toast.error("Choose a court, sport, and session option.");
      return null;
    }
    if (!selectedSport.supportedPaymentMethods.includes(draft.paymentMethod)) {
      toast.error("Choose a payment method supported by this court option.");
      return null;
    }
    if (!draft.bookingDate || draft.bookingDate < today) {
      toast.error("Choose today or a future booking date.");
      return null;
    }
    if (latestBookingDate && draft.bookingDate > latestBookingDate) {
      toast.error(
        `This venue accepts bookings up to ${bookableVenue?.maxAdvanceBookingDays ?? 0} days ahead.`,
      );
      return null;
    }
    if (!draft.startTime) {
      toast.error("Choose a start time.");
      return null;
    }

    const phone = normalizePhone(draft.playerPhoneE164);
    if (phone && !/^\+\d{7,15}$/.test(phone)) {
      toast.error("Enter the phone number in international format, such as +96170123456.");
      return null;
    }

    const payload: AdminBookingRequest = {
      venueId: Number(selectedVenue.id),
      courtId: Number(selectedCourt.id),
      courtSportId: Number(selectedSport.id),
      bookingOptionId: Number(selectedOption.id),
      bookingDate: draft.bookingDate,
      startTime: draft.startTime,
      paymentMethod: draft.paymentMethod,
    };
    const playerName = draft.playerName.trim();
    const notes = draft.notes.trim();
    if (playerName) payload.playerName = playerName;
    if (phone) payload.playerPhoneE164 = phone;
    if (notes) payload.notes = notes;

    if (draft.recurrenceMode !== "NONE") {
      if (!bookableVenue?.allowRecurringBookings) {
        toast.error("Recurring bookings are disabled for this venue.");
        return null;
      }
      if (draft.paymentMethod !== "CASH") {
        toast.error("Weekly recurring bookings currently support cash only.");
        return null;
      }
      if (draft.recurrenceMode === "COUNT") {
        const occurrences = Number(draft.occurrences);
        if (!Number.isInteger(occurrences) || occurrences < 2 || occurrences > 52) {
          toast.error("Occurrence count must be between 2 and 52.");
          return null;
        }
        payload.recurring = { frequency: "WEEKLY", occurrences };
      } else {
        if (!draft.endDate || draft.endDate < draft.bookingDate) {
          toast.error("End date must be on or after the first booking date.");
          return null;
        }
        const start = new Date(`${draft.bookingDate}T12:00:00`);
        const end = new Date(`${draft.endDate}T12:00:00`);
        const count = Math.floor((end.getTime() - start.getTime()) / 604800000) + 1;
        if (count < 2 || count > 52) {
          toast.error("The end date must produce between 2 and 52 weekly occurrences.");
          return null;
        }
        payload.recurring = { frequency: "WEEKLY", endDate: draft.endDate };
      }
    }
    return payload;
  }

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const payload = buildPayload();
    if (!payload) return;

    inFlight.current = true;
    setIsPreviewing(true);
    setReviewError(null);
    try {
      const result = await previewAdminBooking(payload);
      setReviewPayload(payload);
      setPreview(result);
      setStep("REVIEW");
      if (result.conflicts.length > 0) {
        toast.error("Some occurrences are unavailable. Nothing has been created.");
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Could not preview this booking."));
    } finally {
      inFlight.current = false;
      setIsPreviewing(false);
    }
  }

  async function refreshPreview() {
    if (!reviewPayload || inFlight.current) return;
    inFlight.current = true;
    setIsPreviewing(true);
    setReviewError(null);
    try {
      setPreview(await previewAdminBooking(reviewPayload));
    } catch (error: unknown) {
      setReviewError(getApiErrorMessage(error, "Could not refresh the preview."));
    } finally {
      inFlight.current = false;
      setIsPreviewing(false);
    }
  }

  async function handleCreate() {
    if (!reviewPayload || !preview || inFlight.current) return;
    const hasConflicts =
      preview.conflicts.length > 0 ||
      preview.occurrences.some((occurrence) => occurrence.conflict != null);
    if (hasConflicts) return;

    inFlight.current = true;
    setIsCreating(true);
    setReviewError(null);
    try {
      const result = await createAdminBooking(reviewPayload);
      setCreated(result);
      setStep("SUCCESS");
      toast.success(
        result.occurrences.length === 1
          ? "Booking created"
          : `${result.occurrences.length} bookings created`,
      );
    } catch (error: unknown) {
      const status = getApiErrorStatus(error);
      const message = getApiErrorMessage(error, "Could not create this booking.");
      if (status === 409) {
        setReviewError(
          "Availability changed after this preview. Refresh the review before trying again. No bookings were created.",
        );
      } else {
        setReviewError(message);
      }
      toast.error(message);
    } finally {
      inFlight.current = false;
      setIsCreating(false);
    }
  }

  function resetFlow() {
    setDraft((current) => ({
      ...EMPTY_DRAFT,
      venueId: initialVenueId ?? current.venueId,
      courtId: initialCourtId ?? current.courtId,
      courtSportId: current.courtSportId,
      bookingOptionId: current.bookingOptionId,
      paymentMethod: current.paymentMethod,
    }));
    setPreview(null);
    setReviewPayload(null);
    setCreated(null);
    setReviewError(null);
    setStep("DETAILS");
  }

  if (!canWrite) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] px-6 py-10 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-[var(--text-4)]" />
          <h1 className="mt-4 text-lg font-semibold text-[var(--text-1)]">
            Booking-write permission required
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-3)]">
            Your account cannot create admin bookings. Ask an administrator to grant booking-write access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bookings-create-v2 mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {backHref && (
            <Link
              href={backHref}
              className="mb-3 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--text-4)] transition-colors hover:text-[var(--text-2)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--teal-subtle)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to venue
            </Link>
          )}
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--teal-text)]">
            <CalendarCheck2 className="h-3.5 w-3.5" />
            Admin booking desk
          </div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[var(--text-1)]">
            {selectedCourt ? `Book ${selectedCourt.name}` : "Create a court booking"}
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-5 text-[var(--text-3)]">
            {selectedVenue && selectedCourt
              ? `${selectedVenue.name}, ${selectedCourt.name}. Preview availability and pricing before creation.`
              : "Preview authoritative availability and pricing before creating one booking or a weekly series."}
          </p>
        </div>
        <FlowIndicator step={step} />
      </header>

      {step === "DETAILS" && (
        <form
          onSubmit={handlePreview}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.requestSubmit();
            }
          }}
          noValidate
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
            <div className="bcv2-panel overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-1)]">
              <Section
                number={1}
                icon={MapPin}
                title="Court and session"
                description="Only active, customer-bookable court options are shown."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {initialVenueId ? (
                    <ContextValue
                      label="Venue"
                      value={selectedVenue?.name ?? (loadingVenues ? "Loading venue…" : `Venue ${initialVenueId}`)}
                    />
                  ) : (
                    <SelectField
                      id="booking-venue"
                      label="Venue"
                      value={draft.venueId}
                      onChange={chooseVenue}
                      disabled={loadingVenues}
                      placeholder={loadingVenues ? "Loading venues…" : "Choose venue"}
                    >
                      {venues.map((venue) => (
                        <option
                          key={venue.id}
                          value={venue.id}
                          disabled={venue.status !== "ACTIVE"}
                        >
                          {venue.name}{venue.status !== "ACTIVE" ? " (inactive)" : ""}
                        </option>
                      ))}
                    </SelectField>
                  )}
                  {initialCourtId ? (
                    <ContextValue
                      label="Court"
                      value={selectedCourt?.name ?? (loadingVenue ? "Loading court…" : `Court ${initialCourtId}`)}
                    />
                  ) : (
                    <SelectField
                      id="booking-court"
                      label="Court"
                      value={draft.courtId}
                      onChange={chooseCourt}
                      disabled={!selectedVenue || loadingVenue || courts.length === 0}
                      placeholder={loadingVenue ? "Loading courts…" : "Choose court"}
                    >
                      {courts.map((court) => (
                        <option key={court.id} value={court.id}>
                          {court.name}
                        </option>
                      ))}
                    </SelectField>
                  )}
                  <SelectField
                    id="booking-sport"
                    label="Sport"
                    value={draft.courtSportId}
                    onChange={chooseSport}
                    disabled={!selectedCourt || sports.length === 0}
                    placeholder="Choose sport"
                  >
                    {sports.map((sport) => (
                      <option key={sport.id} value={sport.id}>
                        {sportLabel(sport.sportType)}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    id="booking-option"
                    label="Session option"
                    value={draft.bookingOptionId}
                    onChange={(value) => setField("bookingOptionId", value)}
                    disabled={!selectedSport || options.length === 0}
                    placeholder="Choose duration"
                    hint="Pricing is calculated by the backend for every occurrence."
                  >
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.durationMinutes} minutes{option.isDefault ? " (default)" : ""}
                      </option>
                    ))}
                  </SelectField>
                </div>
                {metadataError && (
                  <div role="alert" className="mt-4 flex gap-2 rounded-lg border border-[rgba(244,63,94,0.18)] bg-[var(--semantic-red-subtle)] px-3 py-2.5 text-[12px] text-[var(--semantic-red)]">
                    <AlertCircle className="mt-px h-4 w-4 shrink-0" />
                    {metadataError}
                  </div>
                )}
              </Section>

              <Section
                number={2}
                icon={CalendarClock}
                title="Date and recurrence"
                description="The selected time repeats weekly when recurrence is enabled."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="booking-date" className={LABEL_CLASS}>
                      First booking date <span className="text-[var(--semantic-red)]">*</span>
                    </Label>
                    <Input
                      id="booking-date"
                      type="date"
                      min={today}
                      max={latestBookingDate}
                      value={draft.bookingDate}
                      onChange={(event) => setField("bookingDate", event.target.value)}
                      className={INPUT_CLASS}
                    />
                    {bookableVenue && (
                      <p className="text-[11.5px] text-[var(--text-4)]">
                        Up to {bookableVenue.maxAdvanceBookingDays} days ahead
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="booking-time" className={LABEL_CLASS}>
                      Start time <span className="text-[var(--semantic-red)]">*</span>
                    </Label>
                    <Input
                      id="booking-time"
                      type="time"
                      step={(selectedSport?.startIntervalMinutes ?? 15) * 60}
                      value={draft.startTime}
                      onChange={(event) => setField("startTime", event.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <fieldset className="mt-5">
                  <legend className={LABEL_CLASS}>Repeat</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <RecurrenceChoice
                      checked={draft.recurrenceMode === "NONE"}
                      label="One-time"
                      description="Create one booking"
                      onClick={() => setField("recurrenceMode", "NONE")}
                    />
                    <RecurrenceChoice
                      checked={draft.recurrenceMode !== "NONE"}
                      label="Weekly"
                      description="Create a linked series"
                      disabled={!bookableVenue?.allowRecurringBookings || !cashSupported}
                      onClick={() => {
                        setDraft((current) => ({
                          ...current,
                          recurrenceMode: "COUNT",
                          paymentMethod: "CASH",
                        }));
                      }}
                    />
                  </div>
                  {bookableVenue && !bookableVenue.allowRecurringBookings && (
                    <p className="mt-2 text-[11.5px] text-[var(--semantic-amber)]">
                      Weekly recurrence is disabled in this venue&apos;s settings.
                    </p>
                  )}
                  {bookableVenue?.allowRecurringBookings && selectedSport && !cashSupported && (
                    <p className="mt-2 text-[11.5px] text-[var(--semantic-amber)]">
                      Weekly recurrence is unavailable because this court option does not accept cash.
                    </p>
                  )}
                </fieldset>

                {draft.recurrenceMode !== "NONE" && (
                  <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-0)] p-4">
                    <div className="mb-3 flex items-center gap-2 text-[12px] text-[var(--text-3)]">
                      <Clock3 className="h-3.5 w-3.5 text-[var(--teal-text)]" />
                      Every week at {draft.startTime ? formatTime(draft.startTime) : "the selected time"}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex cursor-pointer gap-2.5 rounded-lg border border-[var(--border)] px-3 py-3">
                        <input
                          type="radio"
                          name="ending-method"
                          checked={draft.recurrenceMode === "COUNT"}
                          onChange={() => setField("recurrenceMode", "COUNT")}
                          className="mt-0.5 accent-[var(--teal)]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] font-medium text-[var(--text-2)]">Occurrence count</span>
                          <Input
                            aria-label="Number of occurrences"
                            type="number"
                            min={2}
                            max={52}
                            value={draft.occurrences}
                            onChange={(event) => setField("occurrences", event.target.value)}
                            disabled={draft.recurrenceMode !== "COUNT"}
                            className={cn(INPUT_CLASS, "mt-2")}
                          />
                        </span>
                      </label>
                      <label className="flex cursor-pointer gap-2.5 rounded-lg border border-[var(--border)] px-3 py-3">
                        <input
                          type="radio"
                          name="ending-method"
                          checked={draft.recurrenceMode === "END_DATE"}
                          onChange={() => setField("recurrenceMode", "END_DATE")}
                          className="mt-0.5 accent-[var(--teal)]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] font-medium text-[var(--text-2)]">End date</span>
                          <Input
                            aria-label="Recurrence end date"
                            type="date"
                            min={draft.bookingDate || today}
                            max={latestBookingDate}
                            value={draft.endDate}
                            onChange={(event) => setField("endDate", event.target.value)}
                            disabled={draft.recurrenceMode !== "END_DATE"}
                            className={cn(INPUT_CLASS, "mt-2")}
                          />
                        </span>
                      </label>
                    </div>
                    <p className="mt-3 text-[11.5px] text-[var(--text-4)]">
                      Exactly one ending method is sent. Weekly series support 2 to 52 occurrences and cash payment only.
                    </p>
                  </div>
                )}
              </Section>

              <Section
                number={3}
                icon={UserRound}
                title="Player or guest"
                description="Phone matches an existing player when possible; blank details create a walk-in booking."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="player-name" className={LABEL_CLASS}>Player name</Label>
                    <Input
                      id="player-name"
                      value={draft.playerName}
                      maxLength={120}
                      onChange={(event) => setField("playerName", event.target.value)}
                      placeholder="Sara Khalil"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="player-phone" className={LABEL_CLASS}>Phone, international format</Label>
                    <Input
                      id="player-phone"
                      type="tel"
                      value={draft.playerPhoneE164}
                      maxLength={40}
                      onChange={(event) => setField("playerPhoneE164", event.target.value)}
                      placeholder="+96170123456"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
              </Section>

              <Section
                number={4}
                icon={WalletCards}
                title="Payment and notes"
                description="Payment restrictions are checked again during preview and creation."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    id="payment-method"
                    label="Payment method"
                    value={draft.paymentMethod}
                    onChange={(value) => setField("paymentMethod", value as BookingPaymentMethod)}
                    disabled={!selectedSport || draft.recurrenceMode !== "NONE"}
                    placeholder="Choose payment method"
                  >
                    {(selectedSport?.supportedPaymentMethods ?? []).map((method) => (
                      <option key={method} value={method}>
                        {method === "CASH" ? "Cash" : "Online"}
                      </option>
                    ))}
                  </SelectField>
                  <div className="space-y-2 sm:row-span-2">
                    <Label htmlFor="booking-notes" className={LABEL_CLASS}>Internal notes</Label>
                    <Textarea
                      id="booking-notes"
                      value={draft.notes}
                      maxLength={500}
                      onChange={(event) => setField("notes", event.target.value)}
                      placeholder="Optional context for the booking and audit trail"
                      className="min-h-[96px] resize-y border-[var(--border)] bg-[var(--bg-0)] text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-4)] focus-visible:border-[var(--teal)] focus-visible:ring-[3px] focus-visible:ring-[var(--teal-subtle)]"
                    />
                  </div>
                </div>
              </Section>

              <div className="flex flex-col gap-3 bg-[var(--bg-0)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-[11.5px] text-[var(--text-4)]">
                  Preview only. No booking is created yet.
                </p>
                <Button
                  type="submit"
                  disabled={isPreviewing || loadingVenues || loadingVenue}
                  className="h-10 gap-2 bg-[var(--teal)] px-5 font-semibold text-[var(--bg-0)] shadow-[0_0_20px_-6px_rgba(0,212,170,0.35)] hover:bg-[var(--teal-text)]"
                >
                  {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck2 className="h-4 w-4" />}
                  Preview booking
                </Button>
              </div>
            </div>

            <DraftSummary
              venue={selectedVenue}
              court={selectedCourt}
              sport={selectedSport}
              option={selectedOption}
              draft={draft}
            />
          </div>
        </form>
      )}

      {step === "REVIEW" && preview && reviewPayload && (
        <ReviewPanel
          preview={preview}
          payload={reviewPayload}
          venueName={selectedVenue?.name ?? bookableVenue?.name ?? `Venue ${reviewPayload.venueId}`}
          courtName={selectedCourt?.name ?? `Court ${reviewPayload.courtId}`}
          currency={preview.currencyCode ?? bookableVenue?.currencyCode ?? "USD"}
          isCreating={isCreating}
          isRefreshing={isPreviewing}
          error={reviewError}
          onEdit={() => {
            setStep("DETAILS");
            setPreview(null);
            setReviewPayload(null);
            setReviewError(null);
          }}
          onRefresh={refreshPreview}
          onCreate={handleCreate}
        />
      )}

      {step === "SUCCESS" && created && reviewPayload && (
        <SuccessPanel
          created={created}
          payload={reviewPayload}
          venueName={selectedVenue?.name ?? bookableVenue?.name ?? `Venue ${reviewPayload.venueId}`}
          courtName={selectedCourt?.name ?? `Court ${reviewPayload.courtId}`}
          currency={created.currencyCode ?? bookableVenue?.currencyCode ?? "USD"}
          onReset={resetFlow}
        />
      )}
    </div>
  );
}

function RecurrenceChoice({
  checked,
  label,
  description,
  disabled,
  onClick,
}: {
  checked: boolean;
  label: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-3 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--teal-subtle)] disabled:cursor-not-allowed disabled:opacity-40",
        checked
          ? "border-[rgba(0,212,170,0.3)] bg-[var(--teal-subtle)]"
          : "border-[var(--border)] bg-[var(--bg-0)] hover:border-[var(--border-strong)]",
      )}
    >
      <span className="flex items-center gap-2 text-[12.5px] font-medium text-[var(--text-1)]">
        <span className={cn("grid h-4 w-4 place-items-center rounded-full border", checked ? "border-[var(--teal)]" : "border-[var(--border-strong)]")}>
          {checked && <span className="h-2 w-2 rounded-full bg-[var(--teal)]" />}
        </span>
        {label}
      </span>
      <span className="mt-1 block pl-6 text-[11px] text-[var(--text-4)]">{description}</span>
    </button>
  );
}

function DraftSummary({
  venue,
  court,
  sport,
  option,
  draft,
}: {
  venue?: VenueSummaryResponse;
  court?: BookableCourtResponse;
  sport?: BookableCourtSportResponse;
  option?: BookingOptionResponse;
  draft: BookingDraft;
}) {
  return (
    <aside className="bcv2-summary h-fit rounded-xl border border-[var(--border)] bg-[var(--bg-1)] lg:sticky lg:top-0">
      <div className="border-b border-[var(--border)] px-4 py-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--teal-text)]" />
          Draft summary
        </div>
        <p className="mt-1.5 text-[12px] leading-5 text-[var(--text-3)]">
          Availability and price are authoritative only after preview.
        </p>
      </div>
      <dl className="divide-y divide-[var(--border)] px-4">
        <SummaryRow label="Venue" value={venue?.name ?? "Not selected"} />
        <SummaryRow label="Court" value={court?.name ?? "Not selected"} />
        <SummaryRow label="Sport" value={sport ? sportLabel(sport.sportType) : "Not selected"} />
        <SummaryRow label="Session" value={option ? `${option.durationMinutes} minutes` : "Not selected"} mono />
        <SummaryRow label="First date" value={formatDate(draft.bookingDate)} />
        <SummaryRow label="Start" value={formatTime(draft.startTime)} mono />
        <SummaryRow
          label="Schedule"
          value={
            draft.recurrenceMode === "NONE"
              ? "One-time"
              : draft.recurrenceMode === "COUNT"
                ? `${draft.occurrences || "—"} weekly occurrences`
                : `Weekly until ${draft.endDate ? formatDate(draft.endDate) : "—"}`
          }
        />
        <SummaryRow label="Payment" value={draft.paymentMethod === "CASH" ? "Cash" : "Online"} />
      </dl>
      <div className="m-4 rounded-lg border border-[rgba(99,102,241,0.16)] bg-[var(--semantic-blue-subtle)] px-3 py-2.5 text-[11.5px] leading-5 text-[var(--text-3)]">
        The backend checks schedule, conflicts, venue settings, advance limits, and current pricing for every occurrence.
      </div>
    </aside>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="text-[11.5px] text-[var(--text-4)]">{label}</dt>
      <dd className={cn("max-w-[180px] text-right text-[12px] text-[var(--text-2)]", mono && "font-mono tabular-nums")}>
        {value}
      </dd>
    </div>
  );
}

function ReviewPanel({
  preview,
  payload,
  venueName,
  courtName,
  currency,
  isCreating,
  isRefreshing,
  error,
  onEdit,
  onRefresh,
  onCreate,
}: {
  preview: AdminBookingPreviewResponse;
  payload: AdminBookingRequest;
  venueName: string;
  courtName: string;
  currency: string;
  isCreating: boolean;
  isRefreshing: boolean;
  error: string | null;
  onEdit: () => void;
  onRefresh: () => void;
  onCreate: () => void;
}) {
  const rowConflicts = preview.occurrences.filter((item) => item.conflict != null).length;
  const hasConflicts = preview.conflicts.length > 0 || rowConflicts > 0;
  const conflictCount = Math.max(preview.conflicts.length, rowConflicts);

  return (
    <div className="bcv2-panel overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-1)]">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <button type="button" onClick={onEdit} className="mb-2 inline-flex items-center gap-1.5 text-[11.5px] text-[var(--text-4)] hover:text-[var(--text-2)]">
            <ArrowLeft className="h-3.5 w-3.5" /> Edit details
          </button>
          <h2 className="text-lg font-semibold text-[var(--text-1)]">Review before creating</h2>
          <p className="mt-1 text-[12.5px] text-[var(--text-3)]">
            {venueName} · {courtName} · {payload.recurring ? "Weekly series" : "One-time booking"}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">Total</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--text-1)]">
            {formatMoney(previewTotal(preview), currency)}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-4)]">
            {preview.occurrences.length} occurrence{preview.occurrences.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {hasConflicts && (
        <div role="alert" className="mx-5 mt-5 flex gap-3 rounded-lg border border-[rgba(244,63,94,0.2)] bg-[var(--semantic-red-subtle)] px-4 py-3 sm:mx-6">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--semantic-red)]" />
          <div>
            <p className="text-[12.5px] font-semibold text-[var(--semantic-red)]">
              {conflictCount} conflict{conflictCount === 1 ? "" : "s"} found
            </p>
            <p className="mt-0.5 text-[11.5px] leading-5 text-[var(--text-3)]">
              Creation is disabled. Edit the booking or refresh after the schedule changes. No partial series will be created.
            </p>
            {preview.conflicts.length > 0 && (
              <ul className="mt-2 space-y-1 text-[11.5px] leading-5 text-[var(--text-3)]">
                {preview.conflicts.map((conflict, index) => (
                  <li key={index}>• {unknownConflictMessage(conflict)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="mx-5 mt-5 flex items-start justify-between gap-3 rounded-lg border border-[rgba(245,158,11,0.2)] bg-[var(--semantic-amber-subtle)] px-4 py-3 text-[12px] text-[var(--semantic-amber)] sm:mx-6">
          <span>{error}</span>
          <button type="button" onClick={onRefresh} disabled={isRefreshing} className="shrink-0 font-semibold underline underline-offset-4 disabled:opacity-50">Refresh review</button>
        </div>
      )}

      <OccurrenceTable occurrences={preview.occurrences} currency={currency} />

      <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--bg-0)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <button type="button" onClick={onRefresh} disabled={isRefreshing || isCreating} className="inline-flex items-center gap-2 text-[12px] font-medium text-[var(--text-3)] hover:text-[var(--text-1)] disabled:opacity-50">
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          Refresh availability and prices
        </button>
        <Button
          type="button"
          onClick={onCreate}
          disabled={hasConflicts || isCreating || isRefreshing}
          className="h-10 gap-2 bg-[var(--teal)] px-5 font-semibold text-[var(--bg-0)] shadow-[0_0_20px_-6px_rgba(0,212,170,0.35)] hover:bg-[var(--teal-text)]"
        >
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {isCreating ? "Creating safely…" : preview.occurrences.length === 1 ? "Create booking" : `Create all ${preview.occurrences.length}`}
        </Button>
      </div>
    </div>
  );
}

function OccurrenceTable({
  occurrences,
  currency,
}: {
  occurrences: Array<AdminBookingOccurrencePreview | AdminCreatedBookingOccurrence>;
  currency: string;
}) {
  return (
    <div className="overflow-x-auto px-5 py-5 sm:px-6">
      <table className="w-full min-w-[620px] border-separate border-spacing-0 text-left">
        <thead>
          <tr className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
            <th className="border-b border-[var(--border)] px-3 py-2.5">#</th>
            <th className="border-b border-[var(--border)] px-3 py-2.5">Date</th>
            <th className="border-b border-[var(--border)] px-3 py-2.5">Time</th>
            <th className="border-b border-[var(--border)] px-3 py-2.5">Price</th>
            <th className="border-b border-[var(--border)] px-3 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {occurrences.map((occurrence, index) => {
            const conflict = "conflict" in occurrence ? conflictMessage(occurrence.conflict) : null;
            const amount = occurrence.priceAmount ?? ("totalAmount" in occurrence ? occurrence.totalAmount : undefined);
            const status = "status" in occurrence ? occurrence.status : undefined;
            return (
              <tr key={`${occurrence.bookingDate}-${occurrence.startTime}-${index}`}>
                <td className="border-b border-[var(--border)] px-3 py-3 font-mono text-[11px] tabular-nums text-[var(--text-4)]">{String(index + 1).padStart(2, "0")}</td>
                <td className="border-b border-[var(--border)] px-3 py-3 text-[12.5px] font-medium text-[var(--text-2)]">{formatDate(occurrence.bookingDate)}</td>
                <td className="border-b border-[var(--border)] px-3 py-3 font-mono text-[12px] tabular-nums text-[var(--text-3)]">
                  {formatTime(occurrence.startTime)}{occurrence.endTime ? ` – ${formatTime(occurrence.endTime)}` : ""}{occurrence.endsNextDay ? " +1d" : ""}
                </td>
                <td className={cn("border-b border-[var(--border)] px-3 py-3 font-mono text-[12px] font-medium tabular-nums", amount == null ? "text-[var(--semantic-red)]" : "text-[var(--text-1)]")}>
                  {formatMoney(amount, occurrence.currencyCode ?? currency)}
                </td>
                <td className="border-b border-[var(--border)] px-3 py-3">
                  {conflict ? (
                    <span className="inline-flex max-w-[260px] items-start gap-1.5 text-[11.5px] leading-4 text-[var(--semantic-red)]"><AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />{conflict}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--semantic-green-subtle)] px-2 py-1 text-[10.5px] font-medium text-[var(--semantic-green)]"><CheckCircle2 className="h-3 w-3" />{status ? sportLabel(status) : "Available"}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SuccessPanel({
  created,
  payload,
  venueName,
  courtName,
  currency,
  onReset,
}: {
  created: AdminBookingCreateResponse;
  payload: AdminBookingRequest;
  venueName: string;
  courtName: string;
  currency: string;
  onReset: () => void;
}) {
  const seriesId = created.seriesId ?? created.recurringSeriesId;
  return (
    <div className="bcv2-panel overflow-hidden rounded-xl border border-[rgba(16,185,129,0.2)] bg-[var(--bg-1)]">
      <div className="flex flex-col gap-5 border-b border-[var(--border)] px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[rgba(16,185,129,0.22)] bg-[var(--semantic-green-subtle)] text-[var(--semantic-green)]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-1)]">
              {created.occurrences.length === 1 ? "Booking created" : "Booking series created"}
            </h2>
            <p className="mt-1 text-[12.5px] text-[var(--text-3)]">
              {venueName} · {courtName} · {created.occurrences.length} occurrence{created.occurrences.length === 1 ? "" : "s"}
            </p>
            {seriesId && (
              <p className="mt-2 font-mono text-[11px] tabular-nums text-[var(--text-4)]">Series ID {seriesId}</p>
            )}
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">Created total</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--semantic-green)]">{formatMoney(createdTotal(created), currency)}</p>
        </div>
      </div>
      <div className="mx-5 mt-5 flex gap-2.5 rounded-lg border border-[rgba(99,102,241,0.16)] bg-[var(--semantic-blue-subtle)] px-4 py-3 text-[11.5px] leading-5 text-[var(--text-3)] sm:mx-6">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--semantic-blue)]" />
        Created by an admin as one atomic operation. The action and series association are available in audit history.
      </div>
      <OccurrenceTable occurrences={created.occurrences} currency={currency} />
      <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--bg-0)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-[11.5px] text-[var(--text-4)]">
          {payload.playerName || payload.playerPhoneE164 || "Walk-in player"} · {payload.paymentMethod === "CASH" ? "Cash" : "Online"}
        </p>
        <Button type="button" onClick={onReset} variant="outline" className="h-9 border-[var(--border-strong)] bg-[var(--bg-1)] text-[var(--text-2)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]">
          Create another booking
        </Button>
      </div>
    </div>
  );
}
