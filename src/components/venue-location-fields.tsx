"use client";

import { useId, useMemo, useState } from "react";
import { Check, ChevronsUpDown, MapPin, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  findLebanonLocation,
  lebanonCities,
  lebanonGovernorates,
  lebanonLocationsFor,
  type LebanonLocation,
} from "@/lib/lebanon-locations";
import { cn } from "@/lib/utils";
import { cityName } from "@/lib/venue-locality";

interface VenueLocationFieldsProps {
  // Stored `city` value in the backend (plain name; legacy values may still
  // carry a `"<Type>: "` prefix, which is stripped on seed).
  city: string;
  latitude: number;
  longitude: number;
  onCityChange: (city: string) => void;
  onCoordinatesChange: (coords: {
    latitude: number;
    longitude: number;
  }) => void;
  inputClassName?: string;
  labelClassName?: string;
  className?: string;
}

interface SearchOption {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
}

const GOVERNORATES = lebanonGovernorates();

function locationKey(location: LebanonLocation): string {
  return `${location.name}|${location.latitude}|${location.longitude}`;
}

function includesQuery(option: SearchOption, query: string): boolean {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  return [option.label, option.description, ...(option.keywords ?? [])]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLocaleLowerCase().includes(q));
}

function SearchSelect({
  id,
  label,
  value,
  placeholder,
  searchPlaceholder,
  options,
  onChange,
  disabled,
  required,
  inputClassName,
  labelClassName,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  searchPlaceholder: string;
  options: SearchOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  inputClassName?: string;
  labelClassName?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);
  const matches = options.filter((option) => includesQuery(option, query));

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={labelClassName}>
        {label}
        {required && <span className="ml-1 text-[var(--semantic-red)]">*</span>}
      </Label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={(props) => (
            <button
              {...props}
              type="button"
              id={id}
              disabled={disabled}
              role="combobox"
              aria-controls={listId}
              aria-expanded={open}
              aria-required={required}
              className={cn(
                "flex h-9 w-full items-center gap-2 rounded-md border px-3 text-left text-sm outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50",
                inputClassName,
              )}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--text-4)]" />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate",
                  !selected && "text-[var(--text-4)]",
                )}
              >
                {selected ? selected.label : placeholder}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[var(--text-4)]" />
            </button>
          )}
        />
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[var(--anchor-width)] min-w-[18rem] overflow-hidden p-0"
        >
          <div className="border-b border-[var(--border)] p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-4)]" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-0)] pl-8 pr-3 text-[12.5px] text-[var(--text-1)] outline-none transition-all placeholder:text-[var(--text-4)] focus:border-[rgba(0,212,170,0.3)] focus:shadow-[0_0_0_3px_var(--teal-subtle)]"
              />
            </div>
          </div>
          <div
            id={listId}
            role="listbox"
            className="max-h-72 overflow-y-auto overscroll-contain py-1"
          >
            {matches.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12.5px] text-[var(--text-4)]">
                No matching option
              </p>
            ) : (
              matches.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(option.value);
                      handleOpenChange(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2 text-left text-[12.5px] transition-colors",
                      active
                        ? "bg-[var(--teal-subtle)] text-[var(--teal-text)]"
                        : "text-[var(--text-2)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]",
                    )}
                  >
                    <Check
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.description && (
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--text-4)]">
                          {option.description}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Lebanon venue-location entry: select governorate, then the supplied
// city/district column, then the exact locality. Coordinates remain editable.
export function VenueLocationFields({
  city,
  latitude,
  longitude,
  onCityChange,
  onCoordinatesChange,
  inputClassName,
  labelClassName,
  className,
}: VenueLocationFieldsProps) {
  const governorateId = useId();
  const cityId = useId();
  const locationId = useId();
  const latitudeId = useId();
  const longitudeId = useId();

  const initialLocation = useMemo(
    () => findLebanonLocation(cityName(city)),
    [city],
  );
  const [governorate, setGovernorate] = useState(
    initialLocation?.governorate ?? "",
  );
  const [cityDistrict, setCityDistrict] = useState(initialLocation?.city ?? "");
  const [selectedLocationKey, setSelectedLocationKey] = useState(
    initialLocation ? locationKey(initialLocation) : "",
  );

  const governorateOptions = useMemo<SearchOption[]>(
    () =>
      GOVERNORATES.map((name) => ({
        value: name,
        label: name,
      })),
    [],
  );

  const cityOptions = useMemo<SearchOption[]>(
    () =>
      lebanonCities(governorate).map((name) => ({
        value: name,
        label: name,
      })),
    [governorate],
  );

  const locationOptions = useMemo<SearchOption[]>(() => {
    if (!governorate || !cityDistrict) return [];
    return lebanonLocationsFor(governorate, cityDistrict).map((location) => ({
      value: locationKey(location),
      label: location.name,
      description: `${location.city} | ${location.governorate}`,
      keywords: location.aliases,
    }));
  }, [cityDistrict, governorate]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <SearchSelect
          id={governorateId}
          label="Governorate"
          value={governorate}
          placeholder="Select governorate"
          searchPlaceholder="Search governorate"
          options={governorateOptions}
          onChange={(value) => {
            setGovernorate(value);
            setCityDistrict("");
            setSelectedLocationKey("");
            onCityChange("");
            onCoordinatesChange({ latitude: 0, longitude: 0 });
          }}
          required
          inputClassName={inputClassName}
          labelClassName={labelClassName}
        />
        <SearchSelect
          id={cityId}
          label="City / district"
          value={cityDistrict}
          placeholder="Select city / district"
          searchPlaceholder="Search city / district"
          options={cityOptions}
          onChange={(value) => {
            setCityDistrict(value);
            setSelectedLocationKey("");
            onCityChange("");
            onCoordinatesChange({ latitude: 0, longitude: 0 });
          }}
          disabled={!governorate}
          required
          inputClassName={inputClassName}
          labelClassName={labelClassName}
        />
      </div>

      <SearchSelect
        id={locationId}
        label="Location"
        value={selectedLocationKey}
        placeholder="Select location"
        searchPlaceholder="Search location or alias"
        options={locationOptions}
        onChange={(value) => {
          const selected = lebanonLocationsFor(governorate, cityDistrict).find(
            (location) => locationKey(location) === value,
          );
          if (!selected) return;
          setSelectedLocationKey(value);
          onCityChange(selected.name);
          onCoordinatesChange({
            latitude: selected.latitude,
            longitude: selected.longitude,
          });
        }}
        disabled={!governorate || !cityDistrict}
        required
        inputClassName={inputClassName}
        labelClassName={labelClassName}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={latitudeId} className={labelClassName}>
            Latitude
          </Label>
          <Input
            id={latitudeId}
            type="number"
            step="any"
            value={latitude}
            onChange={(e) =>
              onCoordinatesChange({
                latitude: parseFloat(e.target.value) || 0,
                longitude,
              })
            }
            placeholder="e.g. 33.8938"
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
            onChange={(e) =>
              onCoordinatesChange({
                latitude,
                longitude: parseFloat(e.target.value) || 0,
              })
            }
            placeholder="e.g. 35.5018"
            className={inputClassName}
          />
        </div>
      </div>
      <p className="text-[11.5px] leading-5 text-[var(--text-4)]">
        Location selection fills coordinates automatically. Adjust decimal
        degrees manually only when the exact entrance point differs.
      </p>
    </div>
  );
}
