// The backend stores a venue's locality as a single flat `city` string. Older
// records were saved in a folded `"<Type>: <Name>"` form (e.g. "City: Saida").
// We now send the plain name only, but still strip that legacy prefix when
// reading stored values so old venues display and prefill cleanly.

const LEGACY_LOCALITY_TYPES = ["City", "Town", "Village", "District"] as const;

// Separator the legacy fold used between the type tag and the locality name.
const SEPARATOR = ": ";

export function cityName(city: string | null | undefined): string {
  const value = (city ?? "").trim();
  const index = value.indexOf(SEPARATOR);
  if (index > 0) {
    const maybeType = value.slice(0, index);
    if ((LEGACY_LOCALITY_TYPES as readonly string[]).includes(maybeType)) {
      return value.slice(index + SEPARATOR.length).trim();
    }
  }
  return value;
}
