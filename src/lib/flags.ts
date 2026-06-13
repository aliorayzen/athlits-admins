/**
 * ISO 3166-1 alpha-2 country code → flag emoji.
 * Works client-side by mapping each uppercase letter to its Regional Indicator
 * Symbol. Pure utility, no external data.
 */
export function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  const upper = code.toUpperCase();
  const BASE = 0x1f1e6; // regional indicator A
  const A_CODE = 65; // 'A'
  return String.fromCodePoint(
    BASE + (upper.charCodeAt(0) - A_CODE),
    BASE + (upper.charCodeAt(1) - A_CODE),
  );
}
