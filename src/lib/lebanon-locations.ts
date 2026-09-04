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

function distanceInKilometers(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(latitudeA)) *
      Math.cos(radians(latitudeB)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestLebanonLocation(
  latitude: number,
  longitude: number,
  maxDistanceKm = 25,
): LebanonLocation | undefined {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;

  let nearest: LebanonLocation | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const location of locations) {
    const distance = distanceInKilometers(
      latitude,
      longitude,
      location.latitude,
      location.longitude,
    );
    if (distance < nearestDistance) {
      nearest = location;
      nearestDistance = distance;
    }
  }
  return nearestDistance <= maxDistanceKm ? nearest : undefined;
}
