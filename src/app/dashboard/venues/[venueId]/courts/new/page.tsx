"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCourt, getApiErrorMessage, getVenue, uploadCourtImages } from "@/lib/api";
import type {
  CourtAmenityId,
  CourtDivisionLayout,
  CourtEquipmentRequest,
  CourtEnvironment,
  CourtSportRequest,
  CreateCourtRequest,
  SurfaceType,
} from "@/types/api";

const FIELD_CLASS = "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:border-[var(--teal)]/40 focus:ring-[3px] focus:ring-[var(--teal-subtle)]";
const SELECT_CLASS = `h-9 w-full rounded-lg border px-3 text-sm outline-none transition-all ${FIELD_CLASS}`;
const AMENITIES: { value: CourtAmenityId; label: string }[] = [
  { value: "parking", label: "Parking" },
  { value: "lighting", label: "Lighting" },
  { value: "showers", label: "Showers" },
  { value: "lockers", label: "Lockers" },
  { value: "spectator_seating", label: "Spectator seating" },
];
const SURFACES: SurfaceType[] = ["PADEL", "GRASS", "CLAY", "HARD", "SYNTHETIC", "WOOD", "RUBBER", "SAND", "TURF"];

type SportDraft = Omit<CourtSportRequest, "pricing"> & {
  pricing: Omit<CourtSportRequest["pricing"], "currencyCode">;
};

function emptySport(): SportDraft {
  return {
    sportType: "PADEL",
    capacity: 4,
    sessionDurationMinutes: 90,
    courtAreaCode: "FULL",
    pricing: {
      offPeakCentsPerHour: 2500,
      peakCentsPerHour: 4000,
      peakWindow: { startMinutes: 1080, endMinutes: 1320 },
    },
    equipment: [],
  };
}

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export default function CreateCourtPage() {
  const { venueId } = useParams<{ venueId: string }>();
  const router = useRouter();
  const imageInputId = useId();
  const [venueName, setVenueName] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [surfaceType, setSurfaceType] = useState<SurfaceType>("PADEL");
  const [environment, setEnvironment] = useState<CourtEnvironment>("INDOOR");
  const [divisionLayout, setDivisionLayout] = useState<CourtDivisionLayout>("FULL");
  const [sports, setSports] = useState<SportDraft[]>([emptySport()]);
  const [amenityIds, setAmenityIds] = useState<CourtAmenityId[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getVenue(venueId)
      .then((venue) => {
        setVenueName(venue.name);
        setCurrencyCode(venue.currencyCode);
      })
      .catch(() => toast.error("Failed to load venue details"));
  }, [venueId]);

  function updateSport(index: number, patch: Partial<SportDraft>) {
    setSports((current) => current.map((sport, i) => i === index ? { ...sport, ...patch } : sport));
  }

  function updatePricing(index: number, patch: Partial<SportDraft["pricing"]>) {
    setSports((current) => current.map((sport, i) => i === index ? { ...sport, pricing: { ...sport.pricing, ...patch } } : sport));
  }

  function addEquipment(index: number) {
    const equipment: CourtEquipmentRequest = {
      nameEn: "",
      nameAr: "",
      stockQuantity: 1,
      perReservationLimit: 1,
      active: true,
    };
    updateSport(index, { equipment: [...sports[index].equipment, equipment] });
  }

  function updateEquipment(sportIndex: number, equipmentIndex: number, patch: Partial<CourtEquipmentRequest>) {
    updateSport(sportIndex, {
      equipment: sports[sportIndex].equipment.map((item, i) => i === equipmentIndex ? { ...item, ...patch } : item),
    });
  }

  function toggleAmenity(amenity: CourtAmenityId) {
    setAmenityIds((current) => current.includes(amenity) ? current.filter((item) => item !== amenity) : [...current, amenity]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!currencyCode || isSaving) return;
    setIsSaving(true);
    try {
      const payload: CreateCourtRequest = {
        nameEn: nameEn.trim(),
        nameAr: nameAr.trim(),
        surfaceType,
        environment,
        divisionLayout,
        amenityIds,
        sports: sports.map((sport) => ({
          ...sport,
          sportType: sport.sportType.trim().toUpperCase(),
          courtAreaCode: sport.courtAreaCode.trim().toUpperCase(),
          pricing: { ...sport.pricing, currencyCode },
          equipment: sport.equipment.map((item) => ({ ...item, nameEn: item.nameEn.trim(), nameAr: item.nameAr.trim() })),
        })),
      };
      const court = await createCourt(venueId, payload);
      if (images.length > 0) {
        try {
          await uploadCourtImages(venueId, court.id, images);
        } catch (error) {
          toast.warning(`Court created, but images were not uploaded: ${getApiErrorMessage(error)}`);
          router.push(`/dashboard/venues/${venueId}/courts/${court.id}`);
          return;
        }
      }
      toast.success("Court created and ready for bookings");
      router.push(`/dashboard/venues/${venueId}/courts/${court.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create court"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-5 pb-12">
      <header className="flex items-center gap-3">
        <Link href={`/dashboard/venues/${venueId}`} aria-label="Back to venue">
          <Button type="button" variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-[var(--text-1)]">Add court</h1>
          <p className="text-sm text-[var(--text-3)]">{venueName || "Venue"} · created active and bookable</p>
        </div>
      </header>

      <FormSection number="01" title="Court details" description="Identity, surface, environment, and how the playing area divides.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="English name" required><Input required value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={FIELD_CLASS} /></Field>
          <Field label="Arabic name" required><Input required dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className={FIELD_CLASS} /></Field>
          <Field label="Surface"><select value={surfaceType} onChange={(e) => setSurfaceType(e.target.value as SurfaceType)} className={SELECT_CLASS}>{SURFACES.map((value) => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Environment"><select value={environment} onChange={(e) => setEnvironment(e.target.value as CourtEnvironment)} className={SELECT_CLASS}><option>INDOOR</option><option>OUTDOOR</option></select></Field>
          <Field label="Division layout"><select value={divisionLayout} onChange={(e) => setDivisionLayout(e.target.value as CourtDivisionLayout)} className={SELECT_CLASS}><option>FULL</option><option>HALVES</option><option>THIRDS</option><option>QUARTERS</option></select></Field>
          <Field label="Venue currency"><Input readOnly value={currencyCode} className={`${FIELD_CLASS} font-mono`} /></Field>
        </div>
      </FormSection>

      <FormSection number="02" title="Sports and pricing" description="Prices are stored in the smallest currency unit per hour. Add each playable configuration.">
        <div className="space-y-4">
          {sports.map((sport, index) => (
            <div key={index} className="rounded-xl border border-[var(--border)] bg-[var(--bg-0)] p-4">
              <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-[var(--text-1)]">Sport {index + 1}</h3>{sports.length > 1 && <Button type="button" size="icon" variant="ghost" onClick={() => setSports((items) => items.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-[var(--semantic-red)]" /></Button>}</div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Sport type" required><Input required value={sport.sportType} onChange={(e) => updateSport(index, { sportType: e.target.value })} className={FIELD_CLASS} /></Field>
                <Field label="Area code" required><Input required value={sport.courtAreaCode} onChange={(e) => updateSport(index, { courtAreaCode: e.target.value })} className={FIELD_CLASS} /></Field>
                <Field label="Capacity" required><Input required min={1} type="number" value={sport.capacity} onChange={(e) => updateSport(index, { capacity: Number(e.target.value) })} className={FIELD_CLASS} /></Field>
                <Field label="Session minutes" required><Input required min={1} type="number" value={sport.sessionDurationMinutes} onChange={(e) => updateSport(index, { sessionDurationMinutes: Number(e.target.value) })} className={FIELD_CLASS} /></Field>
                <Field label={`Off-peak (${currencyCode || "currency"} cents/hour)`} required><Input required min={0} type="number" value={sport.pricing.offPeakCentsPerHour} onChange={(e) => updatePricing(index, { offPeakCentsPerHour: Number(e.target.value) })} className={FIELD_CLASS} /></Field>
                <Field label={`Peak (${currencyCode || "currency"} cents/hour)`} required><Input required min={0} type="number" value={sport.pricing.peakCentsPerHour} onChange={(e) => updatePricing(index, { peakCentsPerHour: Number(e.target.value) })} className={FIELD_CLASS} /></Field>
                <Field label="Peak starts"><Input type="time" value={minutesToTime(sport.pricing.peakWindow?.startMinutes ?? 1080)} onChange={(e) => updatePricing(index, { peakWindow: { startMinutes: timeToMinutes(e.target.value), endMinutes: sport.pricing.peakWindow?.endMinutes ?? 1320 } })} className={FIELD_CLASS} /></Field>
                <Field label="Peak ends"><Input type="time" value={minutesToTime(sport.pricing.peakWindow?.endMinutes ?? 1320)} onChange={(e) => updatePricing(index, { peakWindow: { startMinutes: sport.pricing.peakWindow?.startMinutes ?? 1080, endMinutes: timeToMinutes(e.target.value) } })} className={FIELD_CLASS} /></Field>
              </div>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between"><Label className="text-xs text-[var(--text-3)]">Equipment</Label><Button type="button" size="sm" variant="outline" onClick={() => addEquipment(index)}><Plus className="mr-1 h-3.5 w-3.5" />Add equipment</Button></div>
                {sport.equipment.map((item, equipmentIndex) => <div key={equipmentIndex} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Input required placeholder="English name" value={item.nameEn} onChange={(e) => updateEquipment(index, equipmentIndex, { nameEn: e.target.value })} className={FIELD_CLASS} /><Input required placeholder="Arabic name" value={item.nameAr} onChange={(e) => updateEquipment(index, equipmentIndex, { nameAr: e.target.value })} className={FIELD_CLASS} /><Input aria-label="Stock quantity" min={0} type="number" value={item.stockQuantity} onChange={(e) => updateEquipment(index, equipmentIndex, { stockQuantity: Number(e.target.value) })} className={FIELD_CLASS} /><Input aria-label="Reservation limit" min={0} type="number" value={item.perReservationLimit} onChange={(e) => updateEquipment(index, equipmentIndex, { perReservationLimit: Number(e.target.value) })} className={FIELD_CLASS} /><Button type="button" variant="ghost" onClick={() => updateSport(index, { equipment: sport.equipment.filter((_, i) => i !== equipmentIndex) })}><Trash2 className="h-4 w-4" />Remove</Button></div>)}
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setSports((items) => [...items, emptySport()])}><Plus className="mr-2 h-4 w-4" />Add sport</Button>
        </div>
      </FormSection>

      <FormSection number="03" title="Amenities and images" description="Amenities are restricted to supported options. The first uploaded image becomes primary.">
        <div className="flex flex-wrap gap-2">{AMENITIES.map(({ value, label }) => <button key={value} type="button" aria-pressed={amenityIds.includes(value)} onClick={() => toggleAmenity(value)} className={`rounded-lg border px-3 py-2 text-sm transition-colors ${amenityIds.includes(value) ? "border-[rgba(0,212,170,0.3)] bg-[var(--teal-subtle)] text-[var(--teal-text)]" : "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-3)] hover:border-[var(--border-strong)]"}`}>{label}</button>)}</div>
        <div className="mt-5"><Label htmlFor={imageInputId} className="mb-2 block text-xs text-[var(--text-3)]">Court images</Label><label htmlFor={imageInputId} className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg-0)] px-4 py-8 text-sm text-[var(--text-3)] hover:bg-[var(--bg-2)]"><ImagePlus className="h-4 w-4" />{images.length ? `${images.length} image${images.length === 1 ? "" : "s"} selected` : "Choose images in primary-first order"}</label><input id={imageInputId} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => setImages(Array.from(e.target.files ?? []))} /></div>
      </FormSection>

      <div className="flex justify-end gap-2"><Link href={`/dashboard/venues/${venueId}`}><Button type="button" variant="outline">Cancel</Button></Link><Button disabled={isSaving || !currencyCode} className="bg-[var(--teal)] font-semibold text-[var(--bg-0)] hover:brightness-110">{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create court</Button></div>
    </form>
  );
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]"><header className="flex gap-3 border-b border-[var(--border)] px-5 py-4"><span className="font-mono text-xs text-[var(--teal-text)]">{number}</span><div><h2 className="text-[15px] font-semibold text-[var(--text-1)]">{title}</h2><p className="text-xs text-[var(--text-4)]">{description}</p></div></header><div className="p-5">{children}</div></section>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="space-y-1.5"><span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-4)]">{label}{required && <span className="text-[var(--semantic-red)]"> *</span>}</span>{children}</label>;
}
