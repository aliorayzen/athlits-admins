// Unicode format characters can be introduced by copy/paste while remaining
// invisible in an input. They are not removed by String.prototype.trim().
const INVISIBLE_FORMAT_CHARACTERS =
  /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/g;

export function normalizeEmail(value: string): string {
  return value.replace(INVISIBLE_FORMAT_CHARACTERS, "").trim();
}
