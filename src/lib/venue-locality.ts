// The backend stores a venue's locality as a single flat `city` string. To let
// operators tag the *kind* of place (city, town, village, …) without a backend
// schema change, we fold the type into that string as a reversible
// `"<Type>: <Name>"` value and parse it back when prefilling a form.

export const LOCALITY_TYPES = ["City", "Town", "Village", "District"] as const;

export type LocalityType = (typeof LOCALITY_TYPES)[number];

export const DEFAULT_LOCALITY_TYPE: LocalityType = "City";

// Separator between the type tag and the locality name. Kept distinctive so a
// plain name that merely contains a colon is unlikely to be misparsed.
const SEPARATOR = ": ";

function isLocalityType(value: string): value is LocalityType {
  return (LOCALITY_TYPES as readonly string[]).includes(value);
}

// Build the stored `city` value. Returns an empty string when no name is given
// so callers can treat "no locality" uniformly (the type alone is meaningless).
export function combineLocality(type: LocalityType, name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return `${type}${SEPARATOR}${trimmed}`;
}

// Split a stored `city` value back into its parts. Legacy/plain values (no type
// prefix) resolve to the default type with the whole string as the name.
export function parseLocality(city: string | null | undefined): {
  type: LocalityType;
  name: string;
} {
  const value = (city ?? "").trim();
  const index = value.indexOf(SEPARATOR);
  if (index > 0) {
    const maybeType = value.slice(0, index);
    if (isLocalityType(maybeType)) {
      return { type: maybeType, name: value.slice(index + SEPARATOR.length) };
    }
  }
  return { type: DEFAULT_LOCALITY_TYPE, name: value };
}
