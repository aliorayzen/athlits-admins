"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, CalendarPlus2, ImagePlus, Loader2, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage, getApiErrorStatus, getCourt, getVenue, saveCourtRecord, uploadCourtImages } from "@/lib/api";
import type { CourtAmenityId, CourtDivisionLayout, CourtEnvironment, CourtRecord, SurfaceType } from "@/types/api";

const FIELD_CLASS = "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:border-[var(--teal)]/40 focus:ring-[3px] focus:ring-[var(--teal-subtle)]";
const SELECT_CLASS = `h-9 w-full rounded-lg border px-3 text-sm outline-none ${FIELD_CLASS}`;
const AMENITIES: { value: CourtAmenityId; label: string }[] = [
  { value: "parking", label: "Parking" }, { value: "lighting", label: "Lighting" },
  { value: "showers", label: "Showers" }, { value: "lockers", label: "Lockers" },
  { value: "spectator_seating", label: "Spectator seating" },
];
const SURFACES: SurfaceType[] = ["PADEL", "GRASS", "CLAY", "HARD", "SYNTHETIC", "WOOD", "RUBBER", "SAND", "TURF", "CONCRETE"];
const LAYOUTS: CourtDivisionLayout[] = ["FULL", "HALVES", "THIRDS", "QUARTERS"];

export default function CourtDetailPage() {
  const { venueId, courtId } = useParams<{ venueId: string; courtId: string }>();
  const router = useRouter();
  const imageInputId = useId();
  const [record, setRecord] = useState<CourtRecord | null>(null);
  const [savedRecord, setSavedRecord] = useState<CourtRecord | null>(null);
  const [venueActive, setVenueActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasVersionConflict, setHasVersionConflict] = useState(false);

  async function loadCourt() {
    setIsLoading(true);
    try {
      const [courtRecord, venue] = await Promise.all([getCourt(venueId, courtId), getVenue(venueId)]);
      setRecord(courtRecord);
      setSavedRecord(courtRecord);
      setVenueActive(venue.status === "ACTIVE");
      setHasVersionConflict(false);
    } catch {
      toast.error("Failed to load court");
      router.push(`/dashboard/venues/${venueId}`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCourt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtId, venueId]);

  function updateRecord(patch: Partial<CourtRecord>) {
    setRecord((current) => current ? { ...current, ...patch } : current);
    setHasVersionConflict(false);
  }

  async function save() {
    if (!record || isSaving) return;
    setIsSaving(true);
    setHasVersionConflict(false);
    try {
      const updated = await saveCourtRecord(venueId, courtId, record);
      setRecord(updated);
      setSavedRecord(updated);
      toast.success("Court configuration saved");
    } catch (error) {
      if (getApiErrorStatus(error) === 409) {
        setHasVersionConflict(true);
        toast.error("Someone else updated this court. Reload before saving again.");
      } else {
        toast.error(getApiErrorMessage(error, "Failed to save court"));
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function addImages(files: File[]) {
    if (!record || files.length === 0 || isSaving) return;
    if (record.imageIds.length + files.length > 5) {
      toast.error("A court can have at most 5 images");
      return;
    }
    setIsSaving(true);
    try {
      await uploadCourtImages(venueId, courtId, files);
      const updated = await getCourt(venueId, courtId);
      setRecord(updated);
      setSavedRecord(updated);
      toast.success("Court images uploaded");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to upload court images"));
    } finally {
      setIsSaving(false);
    }
  }

  function moveImage(index: number, direction: -1 | 1) {
    if (!record) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= record.imageIds.length) return;
    const imageIds = [...record.imageIds];
    [imageIds[index], imageIds[nextIndex]] = [imageIds[nextIndex], imageIds[index]];
    updateRecord({ imageIds });
  }

  if (isLoading) return <div className="mx-auto max-w-5xl space-y-5"><Skeleton className="h-12 w-72" /><Skeleton className="h-80 w-full rounded-2xl" /></div>;
  if (!record) return null;
  const isDirty = JSON.stringify(record) !== JSON.stringify(savedRecord);

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/venues/${venueId}`}><Button variant="ghost" size="icon" aria-label="Back to venue"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div><div className="flex items-center gap-2"><h1 className="text-[26px] font-semibold tracking-tight text-[var(--text-1)]">{record.nameEn || record.nameAr}</h1><StatusBadge active={record.active} /></div><p className="font-mono text-xs text-[var(--text-4)]">Court {courtId} · version {record.version}</p></div>
        </div>
        <div className="flex gap-2">
          {record.active && venueActive && <Link href={`/dashboard/venues/${venueId}/courts/${courtId}/bookings/new`}><Button variant="outline"><CalendarPlus2 className="mr-2 h-4 w-4" />Create booking</Button></Link>}
          <SaveButton disabled={!isDirty || isSaving || hasVersionConflict} busy={isSaving} onClick={save} />
        </div>
      </header>

      {hasVersionConflict && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-[rgba(245,158,11,0.25)] bg-[var(--semantic-amber-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-[var(--semantic-amber)]">This court changed after you loaded it</p><p className="text-xs text-[var(--text-3)]">Reload the latest version, then reapply your changes. Your stale version was not saved.</p></div><Button variant="outline" onClick={loadCourt}><RefreshCw className="mr-2 h-4 w-4" />Reload latest</Button></div>}

      <Section number="01" title="Court details" description="The complete record is replaced atomically when saved.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="English name"><Input required value={record.nameEn} onChange={(e) => updateRecord({ nameEn: e.target.value })} className={FIELD_CLASS} /></Field>
          <Field label="Arabic name"><Input required dir="rtl" value={record.nameAr} onChange={(e) => updateRecord({ nameAr: e.target.value })} className={FIELD_CLASS} /></Field>
          <Field label="Dimensions"><Input value={record.dimensionsLabel ?? ""} onChange={(e) => updateRecord({ dimensionsLabel: e.target.value })} placeholder="40 x 20m" className={FIELD_CLASS} /></Field>
          <Field label="Surface"><select value={record.surfaceType} onChange={(e) => updateRecord({ surfaceType: e.target.value as SurfaceType })} className={SELECT_CLASS}>{SURFACES.map((surface) => <option key={surface}>{surface}</option>)}</select></Field>
          <Field label="Environment"><select value={record.environment} onChange={(e) => updateRecord({ environment: e.target.value as CourtEnvironment })} className={SELECT_CLASS}><option>INDOOR</option><option>OUTDOOR</option></select></Field>
          <Field label="Division layout"><select value={record.divisionLayout} onChange={(e) => updateRecord({ divisionLayout: e.target.value as CourtDivisionLayout })} className={SELECT_CLASS}>{LAYOUTS.map((layout) => <option key={layout}>{layout}</option>)}</select></Field>
          <Field label="Cancellation policy ID"><Input type="number" min={1} value={record.cancellationPolicyId ?? ""} onChange={(e) => updateRecord({ cancellationPolicyId: e.target.value ? Number(e.target.value) : null })} className={`${FIELD_CLASS} font-mono`} /></Field>
          <Field label="Booking status"><select value={record.active ? "ACTIVE" : "INACTIVE"} onChange={(e) => updateRecord({ active: e.target.value === "ACTIVE" })} className={SELECT_CLASS}><option value="ACTIVE">Active and bookable</option><option value="INACTIVE">Inactive</option></select></Field>
        </div>
      </Section>

      <Section number="02" title="Amenities" description="Only backend-supported amenities can be attached.">
        <div className="flex flex-wrap gap-2">{AMENITIES.map(({ value, label }) => { const selected = record.amenityIds.includes(value); return <button key={value} type="button" aria-pressed={selected} onClick={() => updateRecord({ amenityIds: selected ? record.amenityIds.filter((id) => id !== value) : [...record.amenityIds, value] })} className={`rounded-lg border px-3 py-2 text-sm transition-colors ${selected ? "border-[rgba(0,212,170,0.3)] bg-[var(--teal-subtle)] text-[var(--teal-text)]" : "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-3)] hover:border-[var(--border-strong)]"}`}>{label}</button>; })}</div>
      </Section>

      <Section number="03" title="Sports configuration" description="Nested booking options, pricing, and equipment are preserved on every save.">
        <div className="space-y-3">{record.sports.map((sport, index) => <div key={sport.id} className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-0)] p-4 sm:grid-cols-2 lg:grid-cols-5"><Field label="Sport"><Input readOnly value={sport.sportType} className={FIELD_CLASS} /></Field><Field label="Area"><Input readOnly value={sport.courtAreaCode} className={FIELD_CLASS} /></Field><Field label="Capacity"><Input type="number" min={1} value={sport.capacity} onChange={(e) => updateRecord({ sports: record.sports.map((item, i) => i === index ? { ...item, capacity: Number(e.target.value) } : item) })} className={FIELD_CLASS} /></Field><Field label="Session minutes"><Input type="number" min={1} value={sport.sessionDurationMinutes} onChange={(e) => updateRecord({ sports: record.sports.map((item, i) => i === index ? { ...item, sessionDurationMinutes: Number(e.target.value) } : item) })} className={FIELD_CLASS} /></Field><Field label="Start interval"><Input type="number" min={1} value={sport.startIntervalMinutes} onChange={(e) => updateRecord({ sports: record.sports.map((item, i) => i === index ? { ...item, startIntervalMinutes: Number(e.target.value) } : item) })} className={FIELD_CLASS} /></Field><p className="self-end text-xs text-[var(--text-4)] sm:col-span-2 lg:col-span-5">{sport.bookingOptions.length} booking options, {sport.pricingRules.length} pricing rules, {sport.equipment.length} equipment items</p></div>)}</div>
      </Section>

      <Section number="04" title="Image order" description="The first ID is primary. Saving replaces the complete ordered list; maximum 5.">
        <div className="space-y-2">
          {record.imageIds.map((imageId, index) => <div key={imageId} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-3 py-2"><div><span className="font-mono text-sm text-[var(--text-2)]">Image {imageId}</span>{index === 0 && <span className="ml-2 text-[10px] font-semibold uppercase text-[var(--teal-text)]">Primary</span>}</div><div className="flex gap-1"><Button type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => moveImage(index, -1)} aria-label={`Move image ${imageId} up`}><ArrowUp className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" disabled={index === record.imageIds.length - 1} onClick={() => moveImage(index, 1)} aria-label={`Move image ${imageId} down`}><ArrowDown className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" onClick={() => updateRecord({ imageIds: record.imageIds.filter((id) => id !== imageId) })} aria-label={`Remove image ${imageId}`}><Trash2 className="h-4 w-4 text-[var(--semantic-red)]" /></Button></div></div>)}
          {record.imageIds.length === 0 && <p className="rounded-lg border border-dashed border-[var(--border)] py-8 text-center text-sm text-[var(--text-4)]">No court images</p>}
          <label htmlFor={imageInputId} className={`mt-3 inline-flex h-9 cursor-pointer items-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-2)] px-3 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--bg-3)] ${record.imageIds.length >= 5 ? "pointer-events-none opacity-50" : ""}`}><ImagePlus className="mr-2 h-4 w-4" />Upload images</label><input id={imageInputId} disabled={isSaving || record.imageIds.length >= 5} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => void addImages(Array.from(event.target.files ?? []))} />
        </div>
      </Section>

      <div className="flex justify-end"><SaveButton disabled={!isDirty || isSaving || hasVersionConflict} busy={isSaving} onClick={save} /></div>
    </div>
  );
}

function Section({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) { return <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]"><header className="flex gap-3 border-b border-[var(--border)] px-5 py-4"><span className="font-mono text-xs text-[var(--teal-text)]">{number}</span><div><h2 className="text-[15px] font-semibold text-[var(--text-1)]">{title}</h2><p className="text-xs text-[var(--text-4)]">{description}</p></div></header><div className="p-5">{children}</div></section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-1.5"><Label className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-4)]">{label}</Label>{children}</label>; }
function StatusBadge({ active }: { active: boolean }) { return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${active ? "bg-[var(--semantic-green-subtle)] text-[var(--semantic-green)]" : "bg-[var(--bg-2)] text-[var(--text-4)]"}`}>{active ? "Active" : "Inactive"}</span>; }
function SaveButton({ disabled, busy, onClick }: { disabled: boolean; busy: boolean; onClick: () => void }) { return <Button disabled={disabled} onClick={onClick} className="bg-[var(--teal)] font-semibold text-[var(--bg-0)] hover:brightness-110">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save changes</Button>; }
