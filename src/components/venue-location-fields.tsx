"use client";

import { useId, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  combineLocality,
  LOCALITY_TYPES,
  parseLocality,
  type LocalityType,
} from "@/lib/venue-locality";

interface VenueLocationFieldsProps {
  // Stored `city` value in the backend's `"<Type>: <Name>"` form.
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

// Manual venue-location entry: a locality type + name, plus latitude and
// longitude typed by hand. Replaces the former map/geocoder picker.
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
  const typeId = useId();
  const nameId = useId();
  const latitudeId = useId();
  const longitudeId = useId();

  // Seed from the incoming city once. The parent always renders this component
  // after any async prefill resolves, so mount-time seeding is sufficient and
  // local state keeps the chosen type even while the name field is empty.
  const initial = useMemo(() => parseLocality(city), [city]);
  const [type, setType] = useState<LocalityType>(initial.type);
  const [name, setName] = useState(initial.name);

  function emit(nextType: LocalityType, nextName: string) {
    onCityChange(combineLocality(nextType, nextName));
  }

  const selectClassName = cn(
    "h-9 w-full rounded-md border px-3 text-sm outline-none transition-all",
    inputClassName,
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={typeId} className={labelClassName}>
            Locality Type *
          </Label>
          <select
            id={typeId}
            value={type}
            onChange={(e) => {
              const nextType = e.target.value as LocalityType;
              setType(nextType);
              emit(nextType, name);
            }}
            className={selectClassName}
          >
            {LOCALITY_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={nameId} className={labelClassName}>
            Locality Name *
          </Label>
          <Input
            id={nameId}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              emit(type, e.target.value);
            }}
            placeholder="e.g. Beirut, Aramoun"
            required
            className={inputClassName}
          />
        </div>
      </div>

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
        Enter the venue&apos;s coordinates manually as decimal degrees.
      </p>
    </div>
  );
}
