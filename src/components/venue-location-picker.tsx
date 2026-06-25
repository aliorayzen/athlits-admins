"use client";

import dynamic from "next/dynamic";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, LocateFixed, Loader2, MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type LatLngLiteral = { lat: number; lng: number };

type SearchState = "idle" | "loading" | "ready" | "error";
type LocateState = "idle" | "loading" | "error";

type NominatimSearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  address?: NominatimAddress;
};

type NominatimAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country_code?: string;
};

// What the picker hands back when it resolves a human-readable place for the
// current pin. The parent decides whether to apply it (non-destructively).
export interface ResolvedPlace {
  displayName: string;
  addressLine?: string;
  city?: string;
  countryCode?: string;
}

interface VenueLocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (location: { latitude: number; longitude: number }) => void;
  // Called after the pin resolves to a named place (map click, drag, search, or
  // current location). The parent chooses whether to autofill address fields.
  onResolveAddress?: (resolved: ResolvedPlace) => void;
  inputClassName?: string;
  labelClassName?: string;
  className?: string;
}

const VenueLocationMap = dynamic(
  () =>
    import("@/components/venue-location-map").then(
      (mod) => mod.VenueLocationMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[300px] w-full place-items-center bg-[var(--bg-2)] text-[13px] text-[var(--text-2)] sm:h-[360px]">
        Loading map...
      </div>
    ),
  },
);

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 };

function hasUsableCoordinates(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function hasPinnedLocation(latitude: number, longitude: number): boolean {
  return (
    hasUsableCoordinates(latitude, longitude) &&
    (latitude !== 0 || longitude !== 0)
  );
}

function normalizeCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

function resultType(result: NominatimSearchResult): string {
  return [result.class, result.type].filter(Boolean).join(" / ") || "location";
}

// Collapse a Nominatim address object into our flat venue fields.
function toResolvedPlace(
  displayName: string,
  address: NominatimAddress | undefined,
): ResolvedPlace {
  if (!address) return { displayName };
  const street = [address.house_number, address.road].filter(Boolean).join(" ");
  const addressLine =
    street || address.neighbourhood || address.suburb || undefined;
  const city =
    address.city || address.town || address.village || address.county;
  return {
    displayName,
    addressLine,
    city: city || undefined,
    countryCode: address.country_code
      ? address.country_code.toUpperCase()
      : undefined,
  };
}

// Translate a GeolocationPositionError into operator-facing copy. Codes:
// 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT.
function geolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission was blocked. Allow it in your browser's site settings, then try again.";
    case error.POSITION_UNAVAILABLE:
      return "Your location couldn't be determined right now. Search for the address instead.";
    case error.TIMEOUT:
      return "Finding your location took too long. Try again, or search for the address.";
    default:
      return "Couldn't read your current location. Search for the address instead.";
  }
}

export function VenueLocationPicker({
  latitude,
  longitude,
  onChange,
  onResolveAddress,
  inputClassName,
  labelClassName,
  className,
}: VenueLocationPickerProps) {
  const latitudeId = useId();
  const longitudeId = useId();
  const searchId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimSearchResult[]>(
    [],
  );
  const [locateState, setLocateState] = useState<LocateState>("idle");
  const [locateError, setLocateError] = useState("");
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [resolvedPlace, setResolvedPlace] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  // Guards against a slow reverse-geocode overwriting a newer pin's result.
  const reverseSeq = useRef(0);

  const pinnedLocation = useMemo<LatLngLiteral | null>(
    () =>
      hasPinnedLocation(latitude, longitude)
        ? { lat: latitude, lng: longitude }
        : null,
    [latitude, longitude],
  );

  function applyResolved(place: ResolvedPlace) {
    setResolvedPlace(place.displayName);
    onResolveAddress?.(place);
  }

  async function reverseGeocode(position: LatLngLiteral) {
    const seq = ++reverseSeq.current;
    setResolving(true);
    try {
      const params = new URLSearchParams({
        lat: String(position.lat),
        lon: String(position.lng),
        format: "jsonv2",
        addressdetails: "1",
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error("reverse geocode failed");
      const data = (await response.json()) as {
        display_name?: string;
        address?: NominatimAddress;
      };
      if (seq !== reverseSeq.current) return;
      if (data.display_name) {
        applyResolved(toResolvedPlace(data.display_name, data.address));
      }
    } catch {
      // Reverse geocoding is a convenience; the pin still stands on failure.
      if (seq === reverseSeq.current) setResolvedPlace(null);
    } finally {
      if (seq === reverseSeq.current) setResolving(false);
    }
  }

  function updateLocation(
    position: LatLngLiteral,
    options: { reverse?: boolean } = {},
  ) {
    onChange({
      latitude: normalizeCoordinate(position.lat),
      longitude: normalizeCoordinate(position.lng),
    });
    if (options.reverse !== false) void reverseGeocode(position);
  }

  async function runSearch() {
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchState("error");
      setSearchError("Enter at least 3 characters to search.");
      setSearchResults([]);
      return;
    }

    setSearchState("loading");
    setSearchError("");
    try {
      const params = new URLSearchParams({
        q: query,
        format: "jsonv2",
        addressdetails: "1",
        limit: "5",
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error("Location search failed");
      const results = (await response.json()) as NominatimSearchResult[];
      setSearchResults(results);
      setSearchState("ready");
      if (results.length === 0) {
        setSearchError("No matching locations found.");
      }
    } catch {
      setSearchState("error");
      setSearchError("Could not search locations. Try again in a moment.");
      setSearchResults([]);
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    void runSearch();
  }

  function useCurrentLocation() {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setLocateState("error");
      setLocateError(
        "Current location needs a secure (https) connection. Search for the address instead.",
      );
      return;
    }
    if (!("geolocation" in navigator)) {
      setLocateState("error");
      setLocateError(
        "This browser can't share a location. Search for the address instead.",
      );
      return;
    }

    setLocateState("loading");
    setLocateError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAccuracyMeters(
          Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
        );
        updateLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocateState("idle");
      },
      (error) => {
        setLocateState("error");
        setLocateError(geolocationErrorMessage(error));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
    );
  }

  function selectResult(result: NominatimSearchResult) {
    setAccuracyMeters(null);
    // The search result already carries address details, so skip a second
    // network round-trip and resolve from it directly.
    updateLocation(
      { lat: parseFloat(result.lat), lng: parseFloat(result.lon) },
      { reverse: false },
    );
    applyResolved(toResolvedPlace(result.display_name, result.address));
    setSearchQuery(result.display_name);
    setSearchResults([]);
    setSearchState("idle");
    setSearchError("");
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Label className={labelClassName}>Map pin</Label>
          <p className="mt-1 text-[12px] leading-5 text-[var(--text-3)]">
            Search for a location, click the map, or drag the pin to fill the
            venue coordinates.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-0)] px-3 py-2 font-mono text-[11.5px] text-[var(--text-3)]">
          <MapPin className="h-3.5 w-3.5 text-[var(--teal-text)]" />
          {pinnedLocation
            ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            : "No pin selected"}
        </div>
      </div>

      <div className="space-y-2" role="search">
        <Label htmlFor={searchId} className={labelClassName}>
          Search location
        </Label>
        <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto]">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-4)]" />
            <Input
              id={searchId}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by venue, street, city, or landmark"
              className={cn(inputClassName, "pl-9")}
            />
          </div>
          <Button
            type="button"
            onClick={() => void runSearch()}
            disabled={searchState === "loading"}
            className="bg-[linear-gradient(135deg,var(--teal),#00b894)] px-4 font-semibold text-[#06100d] shadow-[0_0_20px_-8px_var(--teal-glow)] hover:brightness-110"
          >
            {searchState === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={useCurrentLocation}
            disabled={locateState === "loading"}
            className="border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-2)] hover:bg-[var(--bg-2)]"
          >
            {locateState === "loading" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="mr-2 h-4 w-4" />
            )}
            Current
          </Button>
        </div>
        {searchError && (
          <p className="text-[12px] text-[var(--semantic-amber)]">
            {searchError}
          </p>
        )}
        {locateError && (
          <p className="text-[12px] text-[var(--semantic-amber)]">
            {locateError}
          </p>
        )}
        {searchResults.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-0)]">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => selectResult(result)}
                className="block w-full border-b border-[var(--border)] px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--bg-2)]"
              >
                <span className="block text-[13px] font-medium leading-5 text-[var(--text-1)]">
                  {result.display_name}
                </span>
                <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-4)]">
                  {resultType(result)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-0)]">
        <VenueLocationMap
          fallbackCenter={DEFAULT_CENTER}
          position={pinnedLocation}
          onChange={(position) => updateLocation(position)}
          accuracyMeters={accuracyMeters}
        />
      </div>

      {(resolving || resolvedPlace) && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-3 py-2.5 text-[12.5px] leading-5">
          {resolving ? (
            <>
              <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-[var(--text-4)]" />
              <span className="text-[var(--text-3)]">Resolving address…</span>
            </>
          ) : (
            <>
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--teal-text)]" />
              <span className="min-w-0 text-[var(--text-2)]">
                <span className="text-[var(--text-4)]">Pinned at </span>
                {resolvedPlace}
              </span>
            </>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={latitudeId} className={labelClassName}>
            Latitude
          </Label>
          <Input
            id={latitudeId}
            type="number"
            step="any"
            value={latitude}
            onChange={(event) =>
              onChange({
                latitude: parseFloat(event.target.value) || 0,
                longitude,
              })
            }
            className={inputClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={longitudeId} className={labelClassName}>
            Longitude
          </Label>
          <Input
            id={longitudeId}
            type="number"
            step="any"
            value={longitude}
            onChange={(event) =>
              onChange({
                latitude,
                longitude: parseFloat(event.target.value) || 0,
              })
            }
            className={inputClassName}
          />
        </div>
      </div>
      <p className="text-[11.5px] leading-5 text-[var(--text-4)]">
        Map data from OpenStreetMap and CARTO. Search and address lookup run
        only on action to keep usage moderate.
      </p>
    </div>
  );
}
