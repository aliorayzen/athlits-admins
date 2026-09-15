"use client";

import { useEffect, useState } from "react";
import { Clock3, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api";
import { courtConfigurationApi as api } from "@/lib/court-configuration-api";
import type {
  AdminCourtDivisionLayout,
  CourtLayoutResponse,
  CourtRuleResponse,
  CourtSportResponse,
  EquipmentRequest,
  EquipmentResponse,
  PricingRuleResponse,
} from "@/types/admin-operations";
import type { Weekday } from "@/types/api";

const FIELD =
  "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-1)] focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]";
const WEEKDAYS: Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export function CourtConfigurationPanel({
  venueId,
  courtId,
  currencyCode,
  aggregateDirty,
  onSaved,
}: {
  venueId: string;
  courtId: string;
  currencyCode: string;
  aggregateDirty: boolean;
  onSaved: () => Promise<void>;
}) {
  const [layout, setLayout] = useState<CourtLayoutResponse | null>(null);
  const [rules, setRules] = useState<CourtRuleResponse[]>([]);
  const [sports, setSports] = useState<CourtSportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.getLayout(venueId, courtId, controller.signal),
      api.listRules(venueId, courtId, controller.signal),
      api.listSports(venueId, courtId, controller.signal),
    ]).then(
      ([nextLayout, nextRules, nextSports]) => {
        if (!controller.signal.aborted) {
          setLayout(nextLayout);
          setRules(nextRules);
          setSports(nextSports);
          setLoading(false);
        }
      },
      (caught: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            getApiErrorMessage(
              caught,
              "Court configuration could not be loaded.",
            ),
          );
          setLoading(false);
        }
      },
    );
    return () => controller.abort();
  }, [courtId, revision, venueId]);

  function reload() {
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  }
  if (loading) return <Skeleton className="h-[32rem] rounded-2xl" />;
  if (!layout) return <ErrorState message={error} retry={reload} />;

  return (
    <fieldset
      disabled={aggregateDirty}
      className="space-y-5 disabled:opacity-70"
    >
      {aggregateDirty && (
        <p className="rounded-lg border border-[rgb(var(--amber-rgb)/0.25)] bg-[var(--semantic-amber-subtle)] px-4 py-3 text-xs text-[var(--text-2)]">
          Save or discard court-detail changes before editing granular
          configuration.
        </p>
      )}
      <LayoutEditor
        venueId={venueId}
        courtId={courtId}
        layout={layout}
        onChanged={(value) => {
          setLayout(value);
          void onSaved();
        }}
      />
      <RulesEditor
        venueId={venueId}
        courtId={courtId}
        rules={rules}
        onChanged={setRules}
      />
      <SportsEditor
        venueId={venueId}
        courtId={courtId}
        sports={sports}
        currencyCode={currencyCode}
        onChanged={(value) => {
          setSports(value);
          void onSaved();
        }}
      />
    </fieldset>
  );
}

function LayoutEditor({
  venueId,
  courtId,
  layout,
  onChanged,
}: {
  venueId: string;
  courtId: string;
  layout: CourtLayoutResponse;
  onChanged: (value: CourtLayoutResponse) => void;
}) {
  const [draft, setDraft] = useState<AdminCourtDivisionLayout>(
    layout.divisionLayout,
  );
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      onChanged(await api.updateLayout(venueId, courtId, draft));
      toast.success("Court layout updated");
    } catch (caught) {
      toast.error(getApiErrorMessage(caught, "Layout could not be updated."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Panel
      title="Layout"
      description="Changing divisions can be rejected when future bookings depend on an area."
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Division layout">
          <select
            className={`h-9 rounded-md border px-3 text-sm ${FIELD}`}
            value={draft}
            onChange={(event) =>
              setDraft(event.target.value as AdminCourtDivisionLayout)
            }
          >
            <option value="FULL_ONLY">Full court only</option>
            <option value="HALVES">Full court and halves</option>
            <option value="HALVES_ONLY">Halves only</option>
          </select>
        </Field>
        <Button
          disabled={saving || draft === layout.divisionLayout}
          onClick={() => void save()}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save layout
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {layout.areas.map((area) => (
          <span
            key={area.id}
            className="rounded-md border border-[var(--border)] bg-[var(--bg-0)] px-2.5 py-1 text-xs text-[var(--text-3)]"
          >
            {area.nameEn || area.code} · #{area.id}
          </span>
        ))}
      </div>
    </Panel>
  );
}

function RulesEditor({
  venueId,
  courtId,
  rules,
  onChanged,
}: {
  venueId: string;
  courtId: string;
  rules: CourtRuleResponse[];
  onChanged: (rules: CourtRuleResponse[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function add() {
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setPending(true);
    try {
      const created = await api.createRule(venueId, courtId, {
        title: title.trim(),
        description: description.trim(),
      });
      onChanged([...rules, created]);
      setTitle("");
      setDescription("");
      toast.success("Court rule added");
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Rule could not be added."));
    } finally {
      setPending(false);
    }
  }
  async function remove(id: number) {
    setPending(true);
    try {
      await api.deleteRule(venueId, courtId, String(id));
      onChanged(rules.filter((rule) => rule.id !== id));
      toast.success("Court rule removed");
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Rule could not be removed."));
    } finally {
      setPending(false);
    }
  }
  return (
    <Panel
      title="Rules"
      description="Court-specific instructions shown to operators and players."
    >
      {rules.length === 0 ? (
        <p className="text-sm text-[var(--text-4)]">No court rules.</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-start justify-between gap-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-1)]">
                  {rule.title}
                </p>
                <p className="mt-1 text-xs text-[var(--text-3)]">
                  {rule.description}
                </p>
              </div>
              <DeleteAction
                label={`Delete ${rule.title}`}
                description="This rule will be removed permanently."
                pending={pending}
                onDelete={() => remove(rule.id)}
              />
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
        <Field label="Title">
          <Input
            maxLength={80}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            className={FIELD}
          />
        </Field>
        <Field label="Description">
          <Input
            maxLength={200}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError("");
            }}
            className={FIELD}
          />
        </Field>
        <Button
          className="self-end"
          disabled={pending}
          onClick={() => void add()}
        >
          <Plus className="h-4 w-4" />
          Add rule
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-[var(--red-text)]">
          {error}
        </p>
      )}
    </Panel>
  );
}

function SportsEditor({
  venueId,
  courtId,
  sports,
  currencyCode,
  onChanged,
}: {
  venueId: string;
  courtId: string;
  sports: CourtSportResponse[];
  currencyCode: string;
  onChanged: (sports: CourtSportResponse[]) => void;
}) {
  const [sportType, setSportType] = useState("");
  const [pending, setPending] = useState(false);
  async function add() {
    if (!sportType.trim()) return;
    setPending(true);
    try {
      const created = await api.createSport(venueId, courtId, {
        sportType: sportType.trim().toUpperCase(),
        sessionDurationMinutes: 60,
        startIntervalMinutes: 30,
        capacity: 2,
        bookingOptions: [{ durationMinutes: 60, default: true, active: true }],
      });
      onChanged([...sports, created]);
      setSportType("");
      toast.success("Court sport added");
    } catch (caught) {
      toast.error(getApiErrorMessage(caught, "Sport could not be added."));
    } finally {
      setPending(false);
    }
  }
  async function remove(id: number) {
    setPending(true);
    try {
      await api.deleteSport(venueId, courtId, String(id));
      onChanged(sports.filter((sport) => sport.id !== id));
      toast.success("Court sport removed");
    } catch (caught) {
      toast.error(getApiErrorMessage(caught, "Sport could not be removed."));
    } finally {
      setPending(false);
    }
  }
  return (
    <Panel
      title="Sports, equipment and pricing"
      description="Each sport is saved independently; deleting one also deactivates its pricing and equipment."
    >
      <div className="space-y-4">
        {sports.map((sport) => (
          <SportRow
            key={sport.id}
            venueId={venueId}
            courtId={courtId}
            sport={sport}
            currencyCode={currencyCode}
            onUpdated={(updated) =>
              onChanged(
                sports.map((item) => (item.id === updated.id ? updated : item)),
              )
            }
            onDelete={() => remove(sport.id)}
            pendingDelete={pending}
          />
        ))}
        {sports.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--text-4)]">
            No sports configured.
          </p>
        )}
      </div>
      <div className="mt-5 flex items-end gap-2">
        <Field label="Sport type">
          <Input
            value={sportType}
            placeholder="PADEL"
            onChange={(e) => setSportType(e.target.value)}
            className={FIELD}
          />
        </Field>
        <Button
          disabled={pending || !sportType.trim()}
          onClick={() => void add()}
        >
          <Plus className="h-4 w-4" />
          Add sport
        </Button>
      </div>
    </Panel>
  );
}

function SportRow({
  venueId,
  courtId,
  sport,
  currencyCode,
  onUpdated,
  onDelete,
  pendingDelete,
}: {
  venueId: string;
  courtId: string;
  sport: CourtSportResponse;
  currencyCode: string;
  onUpdated: (sport: CourtSportResponse) => void;
  onDelete: () => Promise<void>;
  pendingDelete: boolean;
}) {
  const [capacity, setCapacity] = useState(sport.capacity);
  const [duration, setDuration] = useState(sport.sessionDurationMinutes);
  const [interval, setInterval] = useState(sport.startIntervalMinutes);
  const [saving, setSaving] = useState(false);
  async function save() {
    if (
      capacity < 1 ||
      duration < 15 ||
      duration > 720 ||
      interval < 1 ||
      interval > 720
    )
      return;
    setSaving(true);
    try {
      const updated = await api.updateSport(
        venueId,
        courtId,
        String(sport.id),
        {
          capacity,
          sessionDurationMinutes: duration,
          startIntervalMinutes: interval,
          bookingOptions: sport.bookingOptions.map((option) => ({
            id: option.id,
            durationMinutes: option.durationMinutes,
            default: option.default,
            active: option.active,
          })),
        },
      );
      onUpdated(updated);
      toast.success("Sport updated");
    } catch (caught) {
      toast.error(getApiErrorMessage(caught, "Sport could not be updated."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-0)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-1)]">
            {sport.sportType}
          </p>
          <p className="text-xs text-[var(--text-4)]">
            {sport.courtAreaName || sport.courtAreaCode || "Full court"} · sport
            #{sport.id}
          </p>
        </div>
        <DeleteAction
          label={`Delete ${sport.sportType}`}
          description="Pricing and equipment for this sport will also be deactivated."
          pending={pendingDelete}
          onDelete={onDelete}
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <NumberField
          label="Capacity"
          value={capacity}
          onChange={setCapacity}
          min={1}
        />
        <NumberField
          label="Session minutes"
          value={duration}
          onChange={setDuration}
          min={15}
        />
        <NumberField
          label="Start interval"
          value={interval}
          onChange={setInterval}
          min={1}
        />
        <Button
          className="self-end"
          disabled={
            saving ||
            (capacity === sport.capacity &&
              duration === sport.sessionDurationMinutes &&
              interval === sport.startIntervalMinutes)
          }
          onClick={() => void save()}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save sport
        </Button>
      </div>
      <SportResources
        venueId={venueId}
        courtId={courtId}
        sport={sport}
        currencyCode={currencyCode}
      />
    </div>
  );
}

function SportResources({
  venueId,
  courtId,
  sport,
  currencyCode,
}: {
  venueId: string;
  courtId: string;
  sport: CourtSportResponse;
  currencyCode: string;
}) {
  const [equipment, setEquipment] = useState<EquipmentResponse[]>([]);
  const [pricing, setPricing] = useState<PricingRuleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.listEquipment(venueId, courtId, String(sport.id), controller.signal),
      api.listPricing(venueId, courtId, String(sport.id), controller.signal),
    ]).then(
      ([items, rules]) => {
        if (!controller.signal.aborted) {
          setEquipment(items);
          setPricing(rules);
          setLoading(false);
        }
      },
      () => {
        if (!controller.signal.aborted) setLoading(false);
      },
    );
    return () => controller.abort();
  }, [courtId, sport.id, venueId]);
  if (loading) return <Skeleton className="mt-4 h-24" />;
  return (
    <div className="mt-5 grid gap-5 border-t border-[var(--border)] pt-4 lg:grid-cols-2">
      <EquipmentEditor
        venueId={venueId}
        courtId={courtId}
        sportId={String(sport.id)}
        items={equipment}
        onChanged={setEquipment}
        currencyCode={currencyCode}
      />
      <PricingEditor
        venueId={venueId}
        courtId={courtId}
        sportId={String(sport.id)}
        rules={pricing}
        onChanged={setPricing}
        currencyCode={currencyCode}
      />
    </div>
  );
}

function EquipmentEditor({
  venueId,
  courtId,
  sportId,
  items,
  onChanged,
  currencyCode,
}: {
  venueId: string;
  courtId: string;
  sportId: string;
  items: EquipmentResponse[];
  onChanged: (items: EquipmentResponse[]) => void;
  currencyCode: string;
}) {
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [stock, setStock] = useState(1);
  const [limit, setLimit] = useState(1);
  const [price, setPrice] = useState(0);
  const [pending, setPending] = useState(false);
  async function add() {
    if (
      !nameEn.trim() ||
      !nameAr.trim() ||
      stock < 1 ||
      limit < 1 ||
      limit > stock ||
      price < 0
    )
      return;
    const payload: EquipmentRequest = {
      nameEn: nameEn.trim(),
      nameAr: nameAr.trim(),
      stockQuantity: stock,
      perReservationLimit: limit,
      active: true,
      priceTiers: [
        { minimumQuantity: 1, maximumQuantity: limit, flatPrice: price },
      ],
    };
    setPending(true);
    try {
      const created = await api.createEquipment(
        venueId,
        courtId,
        sportId,
        payload,
      );
      onChanged([...items, created]);
      setNameEn("");
      setNameAr("");
      toast.success("Equipment added");
    } catch (caught) {
      toast.error(getApiErrorMessage(caught, "Equipment could not be added."));
    } finally {
      setPending(false);
    }
  }
  async function remove(id: number) {
    setPending(true);
    try {
      await api.deleteEquipment(venueId, courtId, sportId, String(id));
      onChanged(items.filter((item) => item.id !== id));
      toast.success("Equipment removed");
    } catch (caught) {
      toast.error(
        getApiErrorMessage(caught, "Equipment could not be removed."),
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
        Equipment
      </h4>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <EquipmentItem
            key={item.id}
            venueId={venueId}
            courtId={courtId}
            sportId={sportId}
            item={item}
            pending={pending}
            onSaved={(saved) =>
              onChanged(
                items.map((value) => (value.id === saved.id ? saved : value)),
              )
            }
            onDelete={() => remove(item.id)}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Input
          aria-label="Equipment English name"
          placeholder="English name"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          className={FIELD}
        />
        <Input
          aria-label="Equipment Arabic name"
          dir="rtl"
          placeholder="Arabic name"
          value={nameAr}
          onChange={(e) => setNameAr(e.target.value)}
          className={FIELD}
        />
        <NumberField label="Stock" value={stock} onChange={setStock} min={1} />
        <NumberField
          label="Reservation limit"
          value={limit}
          onChange={setLimit}
          min={1}
        />
        <NumberField
          label={`Flat price (${currencyCode})`}
          value={price}
          onChange={setPrice}
          min={0}
        />
        <Button
          className="self-end"
          disabled={pending}
          onClick={() => void add()}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  );
}

function EquipmentItem({
  venueId,
  courtId,
  sportId,
  item,
  pending,
  onSaved,
  onDelete,
}: {
  venueId: string;
  courtId: string;
  sportId: string;
  item: EquipmentResponse;
  pending: boolean;
  onSaved: (item: EquipmentResponse) => void;
  onDelete: () => Promise<void>;
}) {
  const [stock, setStock] = useState(item.stockQuantity);
  const [limit, setLimit] = useState(item.perReservationLimit);
  const [saving, setSaving] = useState(false);
  async function save() {
    if (stock < 1 || limit < 1 || limit > stock) return;
    setSaving(true);
    try {
      const saved = await api.updateEquipment(
        venueId,
        courtId,
        sportId,
        String(item.id),
        {
          nameEn: item.nameEn,
          nameAr: item.nameAr,
          stockQuantity: stock,
          perReservationLimit: limit,
          active: item.active,
          priceTiers: item.priceTiers.map(
            ({ minimumQuantity, maximumQuantity, flatPrice }) => ({
              minimumQuantity,
              maximumQuantity,
              flatPrice,
            }),
          ),
        },
      );
      onSaved(saved);
      toast.success("Equipment updated");
    } catch (caught) {
      toast.error(
        getApiErrorMessage(caught, "Equipment could not be updated."),
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="rounded-lg border border-[var(--border)] p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--text-2)]">
          {item.nameEn} ·{" "}
          {item.priceTiers
            .map(
              (tier) =>
                `${tier.minimumQuantity}–${tier.maximumQuantity}: ${tier.flatPrice} ${tier.currencyCode || ""}`,
            )
            .join(", ")}
        </span>
        <DeleteAction
          label={`Delete ${item.nameEn}`}
          description="Existing booking references remain resolvable; the item is deactivated."
          pending={pending}
          onDelete={onDelete}
        />
      </div>
      <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
        <NumberField label="Stock" value={stock} onChange={setStock} min={1} />
        <NumberField label="Limit" value={limit} onChange={setLimit} min={1} />
        <Button
          size="sm"
          variant="outline"
          className="self-end"
          disabled={
            saving ||
            (stock === item.stockQuantity && limit === item.perReservationLimit)
          }
          onClick={() => void save()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
        </Button>
      </div>
    </div>
  );
}

function PricingEditor({
  venueId,
  courtId,
  sportId,
  rules,
  onChanged,
  currencyCode,
}: {
  venueId: string;
  courtId: string;
  sportId: string;
  rules: PricingRuleResponse[];
  onChanged: (rules: PricingRuleResponse[]) => void;
  currencyCode: string;
}) {
  const [day, setDay] = useState<Weekday>("MONDAY");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("22:00");
  const [price, setPrice] = useState(1);
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [base, setBase] = useState(false);
  const [pending, setPending] = useState(false);
  async function add() {
    if (end <= start || price < 1) return;
    setPending(true);
    const common = {
      startTime: `${start}:00`,
      endTime: `${end}:00`,
      priceAmount: price,
      currencyCode,
      effectiveFrom,
    };
    try {
      const created = base
        ? await api.createBasePricing(venueId, courtId, sportId, common)
        : [
            await api.createPricing(venueId, courtId, sportId, {
              ...common,
              dayOfWeek: day,
            }),
          ];
      onChanged([...rules, ...created]);
      toast.success("Pricing added");
    } catch (caught) {
      toast.error(getApiErrorMessage(caught, "Pricing could not be added."));
    } finally {
      setPending(false);
    }
  }
  async function remove(rule: PricingRuleResponse) {
    setPending(true);
    try {
      if (rule.pricingRuleGroupId) {
        await api.deletePricingGroup(
          venueId,
          courtId,
          sportId,
          String(rule.pricingRuleGroupId),
        );
        onChanged(
          rules.filter(
            (item) => item.pricingRuleGroupId !== rule.pricingRuleGroupId,
          ),
        );
      } else {
        await api.deletePricing(venueId, courtId, sportId, String(rule.id));
        onChanged(rules.filter((item) => item.id !== rule.id));
      }
      toast.success("Pricing removed");
    } catch (caught) {
      toast.error(getApiErrorMessage(caught, "Pricing could not be removed."));
    } finally {
      setPending(false);
    }
  }
  const visibleRules = rules.filter(
    (rule, index) =>
      !rule.pricingRuleGroupId ||
      rules.findIndex(
        (item) => item.pricingRuleGroupId === rule.pricingRuleGroupId,
      ) === index,
  );
  const pricingSections = groupPricingRules(visibleRules);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
          Pricing
        </h4>
        {visibleRules.length > 0 && (
          <span className="text-[11px] tabular-nums text-[var(--text-4)]">
            {visibleRules.length}{" "}
            {visibleRules.length === 1 ? "schedule" : "schedules"}
          </span>
        )}
      </div>
      <div className="mt-2 space-y-3">
        {pricingSections.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-5 text-center text-xs text-[var(--text-4)]">
            No pricing schedules yet.
          </p>
        ) : (
          pricingSections.map((section) => (
            <section
              key={section.ruleType}
              className="overflow-hidden rounded-xl border border-[var(--border)]"
            >
              <header className="flex items-center justify-between gap-3 bg-[var(--bg-2)] px-3 py-2">
                <p className="text-xs font-semibold text-[var(--text-1)]">
                  {formatRuleType(section.ruleType)}
                </p>
                <span className="text-[11px] tabular-nums text-[var(--text-4)]">
                  {section.rules.length}{" "}
                  {section.rules.length === 1 ? "rule" : "rules"}
                </span>
              </header>
              <div className="divide-y divide-[var(--border)]">
                {section.days.map(({ dayOfWeek, rules: dayRules }) => (
                  <div
                    key={dayOfWeek}
                    className="grid gap-1 px-3 py-2.5 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-3"
                  >
                    <p className="pt-1.5 text-xs font-medium text-[var(--text-3)]">
                      {formatWeekday(dayOfWeek)}
                    </p>
                    <div className="divide-y divide-[var(--border)]">
                      {dayRules.map((rule) => (
                        <PricingItem
                          key={
                            rule.pricingRuleGroupId
                              ? `group-${rule.pricingRuleGroupId}`
                              : rule.id
                          }
                          venueId={venueId}
                          courtId={courtId}
                          sportId={sportId}
                          rule={rule}
                          groupRules={getRelatedPricingRules(rule, rules)}
                          pending={pending}
                          onSaved={(saved) =>
                            onChanged(
                              rule.pricingRuleGroupId
                                ? [
                                    ...rules.filter(
                                      (item) =>
                                        item.pricingRuleGroupId !==
                                        rule.pricingRuleGroupId,
                                    ),
                                    ...saved,
                                  ]
                                : rules.map((item) =>
                                    item.id === rule.id ? saved[0] : item,
                                  ),
                            )
                          }
                          onDelete={() => remove(rule)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-4">
        <Field label="Type">
          <select
            value={base ? "BASE" : "SPECIAL"}
            onChange={(e) => setBase(e.target.value === "BASE")}
            className={`h-9 rounded-md border px-2 text-sm ${FIELD}`}
          >
            <option value="SPECIAL">Special rule</option>
            <option value="BASE">Base pricing</option>
          </select>
        </Field>
        {!base && (
          <Field label="Weekday">
            <select
              value={day}
              onChange={(e) => setDay(e.target.value as Weekday)}
              className={`h-9 rounded-md border px-2 text-sm ${FIELD}`}
            >
              {WEEKDAYS.map((value) => (
                <option key={value}>{formatWeekday(value)}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Starts">
          <Input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={FIELD}
          />
        </Field>
        <Field label="Ends">
          <Input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={FIELD}
          />
        </Field>
        <NumberField
          label={`Price (${currencyCode})`}
          value={price}
          onChange={setPrice}
          min={1}
        />
        <Field label="Effective from">
          <Input
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className={FIELD}
          />
        </Field>
        <Button disabled={pending} onClick={() => void add()}>
          <Plus className="h-4 w-4" />
          Add pricing
        </Button>
      </div>
    </div>
  );
}

function PricingItem({
  venueId,
  courtId,
  sportId,
  rule,
  groupRules,
  pending,
  onSaved,
  onDelete,
}: {
  venueId: string;
  courtId: string;
  sportId: string;
  rule: PricingRuleResponse;
  groupRules: PricingRuleResponse[];
  pending: boolean;
  onSaved: (rules: PricingRuleResponse[]) => void;
  onDelete: () => Promise<void>;
}) {
  const [price, setPrice] = useState(rule.priceAmount);
  const [saving, setSaving] = useState(false);
  async function save() {
    if (price < 1) return;
    setSaving(true);
    try {
      let saved: PricingRuleResponse[];
      if (rule.pricingRuleGroupId) {
        saved = await api.updatePricingGroup(
          venueId,
          courtId,
          sportId,
          String(rule.pricingRuleGroupId),
          {
            name: rule.name || undefined,
            dayOfWeek: rule.dayOfWeek,
            startTime: rule.startTime,
            endTime: rule.endTime,
            endsNextDay: rule.endsNextDay,
            priceAmount: price,
            currencyCode: rule.currencyCode,
            effectiveFrom: rule.effectiveFrom,
            effectiveTo: rule.effectiveTo || undefined,
            optionPrices: groupRules.flatMap((item) =>
              item.bookingOptionId
                ? [
                    {
                      bookingOptionId: item.bookingOptionId,
                      priceAmount: price,
                    },
                  ]
                : [],
            ),
          },
        );
      } else {
        saved = [
          await api.updatePricing(venueId, courtId, sportId, String(rule.id), {
            name: rule.name || undefined,
            dayOfWeek: rule.dayOfWeek,
            startTime: rule.startTime,
            endTime: rule.endTime,
            priceAmount: price,
            currencyCode: rule.currencyCode,
            effectiveFrom: rule.effectiveFrom,
            effectiveTo: rule.effectiveTo || undefined,
          }),
        ];
      }
      onSaved(saved);
      toast.success("Pricing updated");
    } catch (caught) {
      toast.error(getApiErrorMessage(caught, "Pricing could not be updated."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="flex flex-wrap items-end gap-2 py-2 first:pt-0 last:pb-0">
      <div className="min-w-36 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-2)]">
          <Clock3
            className="h-3.5 w-3.5 text-[var(--text-4)]"
            aria-hidden="true"
          />
          {formatTimeRange(rule)}
        </p>
        {rule.effectiveFrom && (
          <p className="mt-1 text-[11px] text-[var(--text-4)]">
            Effective {rule.effectiveFrom}
            {rule.effectiveTo ? ` to ${rule.effectiveTo}` : " onward"}
          </p>
        )}
      </div>
      <NumberField
        label={rule.currencyCode}
        value={price}
        onChange={setPrice}
        min={1}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={saving || price === rule.priceAmount}
        onClick={() => void save()}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
      </Button>
      <DeleteAction
        label="Delete pricing"
        description="This pricing rule will no longer apply to future slot calculations."
        pending={pending}
        onDelete={onDelete}
      />
    </div>
  );
}

function groupPricingRules(rules: PricingRuleResponse[]) {
  const rulesByType = new Map<string, PricingRuleResponse[]>();
  for (const rule of rules)
    rulesByType.set(rule.ruleType, [
      ...(rulesByType.get(rule.ruleType) ?? []),
      rule,
    ]);

  return [...rulesByType.entries()]
    .sort(
      ([left], [right]) =>
        Number(right === "BASE") - Number(left === "BASE") ||
        left.localeCompare(right),
    )
    .map(([ruleType, typeRules]) => ({
      ruleType,
      rules: typeRules,
      days: WEEKDAYS.map((dayOfWeek) => ({
        dayOfWeek,
        rules: typeRules.filter((rule) => rule.dayOfWeek === dayOfWeek),
      })).filter(({ rules: dayRules }) => dayRules.length > 0),
    }));
}

function getRelatedPricingRules(
  rule: PricingRuleResponse,
  rules: PricingRuleResponse[],
) {
  return rule.pricingRuleGroupId
    ? rules.filter(
        (item) => item.pricingRuleGroupId === rule.pricingRuleGroupId,
      )
    : [rule];
}

function formatRuleType(ruleType: string) {
  return ruleType === "BASE"
    ? "Base pricing"
    : `${ruleType.charAt(0)}${ruleType.slice(1).toLowerCase()} pricing`;
}

function formatWeekday(day: Weekday) {
  return `${day.charAt(0)}${day.slice(1).toLowerCase()}`;
}

function formatTimeRange(rule: PricingRuleResponse) {
  const start = rule.startTime.slice(0, 5);
  const end = rule.endTime.slice(0, 5);
  if (start === "00:00" && end === "23:59") return "All day";
  return `${start}–${end}${rule.endsNextDay ? " next day" : ""}`;
}

function DeleteAction({
  label,
  description,
  pending,
  onDelete,
}: {
  label: string;
  description: string;
  pending: boolean;
  onDelete: () => Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button size="icon" variant="ghost" aria-label={label} />}
      >
        <Trash2 className="h-4 w-4 text-[var(--red-text)]" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className="bg-[var(--semantic-red)] text-[var(--bg-0)]"
            onClick={(event) => {
              event.preventDefault();
              void onDelete();
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]">
      <header className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-[15px] font-semibold text-[var(--text-1)]">
          {title}
        </h2>
        <p className="text-xs text-[var(--text-4)]">{description}</p>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
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
function NumberField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={FIELD}
      />
    </Field>
  );
}
function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-5">
      <p role="alert" className="text-sm text-[var(--red-text)]">
        {message}
      </p>
      <Button variant="outline" className="mt-3" onClick={retry}>
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </section>
  );
}
