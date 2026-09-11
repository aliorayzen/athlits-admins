"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus2, ImagePlus, Loader2, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteCourtImage, getApiErrorMessage, getCourt, getVenue, setCourtActive, uploadCourtImages } from "@/lib/api";
import type { CourtResponse } from "@/types/api";

export default function CourtDetailPage() {
  const { venueId, courtId } = useParams<{ venueId: string; courtId: string }>();
  const router = useRouter();
  const inputId = useId();
  const [court, setCourt] = useState<CourtResponse | null>(null);
  const [venueActive, setVenueActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    Promise.all([getCourt(venueId, courtId), getVenue(venueId)])
      .then(([courtData, venue]) => {
        setCourt(courtData);
        setVenueActive(venue.status === "ACTIVE");
      })
      .catch(() => {
        toast.error("Failed to load court");
        router.push(`/dashboard/venues/${venueId}`);
      })
      .finally(() => setIsLoading(false));
  }, [courtId, router, venueId]);

  async function toggleActive() {
    if (!court || isUpdating) return;
    setIsUpdating(true);
    try {
      const updated = await setCourtActive(venueId, court.id, !court.active);
      setCourt(updated);
      toast.success(`Court ${updated.active ? "activated" : "deactivated"}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update court"));
    } finally {
      setIsUpdating(false);
    }
  }

  async function addImages(files: File[]) {
    if (!court || files.length === 0 || isUpdating) return;
    setIsUpdating(true);
    try {
      const imageUrls = await uploadCourtImages(venueId, court.id, files);
      setCourt({ ...court, imageUrls });
      toast.success("Court images updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to upload court images"));
    } finally {
      setIsUpdating(false);
    }
  }

  async function removeImage(imageUrl: string) {
    if (!court || isUpdating) return;
    const imageId = imageUrl.split("?")[0].split("/").filter(Boolean).at(-1);
    if (!imageId) {
      toast.error("This image has no removable identifier");
      return;
    }
    setIsUpdating(true);
    try {
      await deleteCourtImage(venueId, court.id, imageId);
      setCourt({ ...court, imageUrls: court.imageUrls?.filter((url) => url !== imageUrl) });
      toast.success("Court image removed");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to remove court image"));
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) return <div className="mx-auto max-w-5xl space-y-5"><Skeleton className="h-12 w-72" /><Skeleton className="h-72 w-full rounded-2xl" /></div>;
  if (!court) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><Link href={`/dashboard/venues/${venueId}`}><Button variant="ghost" size="icon" aria-label="Back to venue"><ArrowLeft className="h-4 w-4" /></Button></Link><div><div className="flex items-center gap-2"><h1 className="text-[26px] font-semibold tracking-tight text-[var(--text-1)]">{court.name}</h1><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${court.active ? "bg-[var(--semantic-green-subtle)] text-[var(--semantic-green)]" : "bg-[var(--bg-2)] text-[var(--text-4)]"}`}>{court.active ? "Active" : "Inactive"}</span></div><p className="font-mono text-xs text-[var(--text-4)]">Court {court.id}</p></div></div>
        <div className="flex gap-2">{court.active && venueActive && <Link href={`/dashboard/venues/${venueId}/courts/${court.id}/bookings/new`}><Button variant="outline"><CalendarPlus2 className="mr-2 h-4 w-4" />Create booking</Button></Link>}<Button disabled={isUpdating} onClick={toggleActive} variant={court.active ? "outline" : "default"} className={court.active ? "text-[var(--semantic-amber)]" : "bg-[var(--teal)] text-[var(--bg-0)]"}>{isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Power className="mr-2 h-4 w-4" />}{court.active ? "Deactivate" : "Activate"}</Button></div>
      </header>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]">
        <header className="border-b border-[var(--border)] px-5 py-4"><h2 className="text-[15px] font-semibold text-[var(--text-1)]">Configuration</h2><p className="text-xs text-[var(--text-4)]">Court details are set at creation; visibility can be changed at any time.</p></header>
        <dl className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 lg:grid-cols-4"><Fact label="Surface" value={court.surfaceType} /><Fact label="Environment" value={court.environment} /><Fact label="Division" value={court.divisionLayout ?? "Not provided"} /><Fact label="Sports" value={court.sports.join(", ") || "Not provided"} /></dl>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4"><div><h2 className="text-[15px] font-semibold text-[var(--text-1)]">Images</h2><p className="text-xs text-[var(--text-4)]">Upload order controls display order; the first image is primary.</p></div><label htmlFor={inputId} className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-2)] px-3 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--bg-3)]"><ImagePlus className="mr-2 h-4 w-4" />Upload</label><input id={inputId} disabled={isUpdating} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => addImages(Array.from(event.target.files ?? []))} /></header>
        <div className="p-5">
          {court.imageUrls?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {court.imageUrls.map((url, index) => (
                <div key={`${url}-${index}`} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-0)]">
                  <Image unoptimized src={url} alt={`${court.name} image ${index + 1}`} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                  {index === 0 && <span className="absolute left-2 top-2 rounded-md bg-[var(--bg-0)]/90 px-2 py-1 text-[10px] font-semibold uppercase text-[var(--teal-text)]">Primary</span>}
                  <Button type="button" size="icon" variant="secondary" disabled={isUpdating} onClick={() => removeImage(url)} aria-label={`Remove image ${index + 1}`} className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
                    <Trash2 className="h-4 w-4 text-[var(--semantic-red)]" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--border)] py-10 text-center text-sm text-[var(--text-4)]">No court images uploaded</div>
          )}
        </div>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-4)]">{label}</dt><dd className="mt-1 text-sm text-[var(--text-2)]">{value}</dd></div>;
}
