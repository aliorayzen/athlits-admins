import rawLocations from "./lebanon-locations-data.json";

export interface LebanonLocation {
  name: string;
  city: string;
  governorate: string;
  latitude: number;
  longitude: number;
  aliases: string[];
}

const locations = rawLocations as LebanonLocation[];

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesLocation(location: LebanonLocation, value: string): boolean {
  const target = normalize(value);
  if (!target) return false;
  return (
    normalize(location.name) === target ||
    location.aliases.some((alias) => normalize(alias) === target)
  );
}

export const LEBANON_LOCATIONS: LebanonLocation[] = locations;

export function lebanonGovernorates(): string[] {
  return uniqueSorted(locations.map((location) => location.governorate));
}

export function lebanonCities(governorate: string): string[] {
  return uniqueSorted(
    locations
      .filter((location) => location.governorate === governorate)
      .map((location) => location.city),
  );
}

export function lebanonLocationsFor(
  governorate: string,
  city: string,
): LebanonLocation[] {
  return locations
    .filter(
      (location) =>
        location.governorate === governorate && location.city === city,
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function findLebanonLocation(
  value: string | null | undefined,
): LebanonLocation | undefined {
  const candidate = (value ?? "").trim();
  if (!candidate) return undefined;
  return locations.find((location) => matchesLocation(location, candidate));
}
