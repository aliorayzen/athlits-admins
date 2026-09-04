export interface GoogleMapsLocation {
  latitude: number;
  longitude: number;
  placeLabel?: string;
  placeName?: string;
  resolvedUrl: string;
}

const GOOGLE_HOSTS = new Set([
  "google.com",
  "maps.google.com",
  "www.google.com",
  "maps.app.goo.gl",
  "goo.gl",
]);

function isCoordinate(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

function coordinatesFromText(
  value: string,
): Pick<GoogleMapsLocation, "latitude" | "longitude"> | null {
  const match = value.match(
    /(-?(?:\d{1,2}(?:\.\d+)?|90(?:\.0+)?))\s*[,،]\s*(-?(?:\d{1,3}(?:\.\d+)?|180(?:\.0+)?))/,
  );
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (
    !isCoordinate(latitude, -90, 90) ||
    !isCoordinate(longitude, -180, 180)
  ) {
    return null;
  }
  return { latitude, longitude };
}

function decodeMapLabel(value: string): string {
  try {
    return decodeURIComponent(value)
      .replace(/\+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return value.replace(/\+/g, " ").replace(/\s+/g, " ").trim();
  }
}

export function isGoogleMapsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    return (
      GOOGLE_HOSTS.has(host) ||
      host.endsWith(".google.com")
    );
  } catch {
    return false;
  }
}

export function parseGoogleMapsUrl(value: string): GoogleMapsLocation | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (!isGoogleMapsUrl(url.toString())) return null;

  const decodedUrl = decodeMapLabel(url.toString());
  const atCoordinates = decodedUrl.match(
    /@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/,
  );
  const dataCoordinates = decodedUrl.match(
    /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/,
  );

  let coordinates = atCoordinates
    ? coordinatesFromText(`${atCoordinates[1]},${atCoordinates[2]}`)
    : null;
  if (!coordinates && dataCoordinates) {
    coordinates = coordinatesFromText(
      `${dataCoordinates[1]},${dataCoordinates[2]}`,
    );
  }

  for (const key of ["query", "q", "ll", "center", "destination"]) {
    if (coordinates) break;
    const candidate = url.searchParams.get(key);
    if (candidate) coordinates = coordinatesFromText(candidate);
  }
  if (!coordinates) return null;

  const placePathMatch = url.pathname.match(/\/maps\/(?:place|search)\/([^/]+)/i);
  const queryLabel = url.searchParams.get("query") ?? url.searchParams.get("q");
  const rawLabel = placePathMatch?.[1] ?? queryLabel ?? "";
  const placeLabel = coordinatesFromText(rawLabel)
    ? ""
    : decodeMapLabel(rawLabel);
  const placeName = placeLabel.split(",")[0]?.trim();

  return {
    ...coordinates,
    placeLabel: placeLabel || undefined,
    placeName: placeName || undefined,
    resolvedUrl: url.toString(),
  };
}
