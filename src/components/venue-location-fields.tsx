"use client";

import { useId, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// Manual venue-location entry: a city name plus latitude and longitude typed
// by hand. Replaces the former map/geocoder picker.
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
  const cityId = useId();
  const latitudeId = useId();
  const longitudeId = useId();

  // Seed from the incoming city once. The parent always renders this component
  // after any async prefill resolves, so mount-time seeding is sufficient.
  const initialName = useMemo(() => cityName(city), [city]);
  const [name, setName] = useState(initialName);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label htmlFor={cityId} className={labelClassName}>
          City *
        </Label>
        <Input
          id={cityId}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            onCityChange(e.target.value);
          }}
          placeholder="e.g. Beirut, Aramoun"
          required
          className={inputClassName}
        />
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
