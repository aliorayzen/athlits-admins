/**
 * Parses the light (`:root`) and dark (`.dark`) token blocks out of globals.css
 * and asserts every text/surface pair meets WCAG AA. Run after any token edit —
 * the light palette shipped before this script failed six pairs silently.
 *
 *   node scripts/check-contrast.mjs
 */
import fs from "node:fs";

const srgb = (x) =>
  x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
const lum = ([r, g, b]) =>
  0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const hex = (h) => {
  const s = h.replace("#", "").trim();
  const full = s.length === 3 ? [...s].map((c) => c + c).join("") : s;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

const css = fs.readFileSync(
  new URL("../src/app/globals.css", import.meta.url),
  "utf8",
);
function tokens(selector) {
  const start = css.indexOf(selector);
  const open = css.indexOf("{", start);
  const end = css.indexOf("\n}", open);
  const body = css.slice(open, end);
  const map = {};
  for (const [, k, v] of body.matchAll(/--([\w-]+):\s*([^;]+);/g))
    map[k] = v.trim();
  return map;
}

// text token -> minimum ratio against every surface it may sit on.
// Minimum ratio per text token, per theme. Dark has enough range to keep
// --text-4 as a decorative-only step (icon strokes, disabled controls, which
// SC 1.4.3 exempts); light does not, so there every step must clear AA.
const TEXT = {
  light: {
    "text-1": 7,
    "text-2": 4.5,
    "text-3": 4.5,
    "text-4": 4.5,
    "teal-text": 4.5,
  },
  dark: {
    "text-1": 7,
    "text-2": 4.5,
    "text-3": 4.5,
    "text-4": 3,
    "teal-text": 4.5,
  },
};
const SURFACES = ["bg-0", "bg-1", "bg-2"];
// Filled accents carry a white (light) or dark (dark) label.
// Each filled accent carries its own ink token; red and blue do not share the
// teal ink, which is too light on red and unreachable on blue.
const FILLS = {
  teal: "on-teal",
  "semantic-green": "on-teal",
  "semantic-amber": "on-amber",
  "semantic-red": "on-danger",
  "semantic-blue": "on-info",
};

let failures = 0;
for (const [name, sel] of [
  ["light", ":root {"],
  ["dark", ".dark {"],
]) {
  const t = tokens(sel);
  console.log(`\n── ${name} ──`);
  for (const [tok, min] of Object.entries(TEXT[name])) {
    for (const s of SURFACES) {
      const r = ratio(hex(t[tok]), hex(t[s]));
      const ok = r >= min;
      if (!ok) failures++;
      console.log(
        `  ${ok ? "OK  " : "FAIL"} ${tok} on ${s}: ${r.toFixed(2)}:1 (min ${min})`,
      );
    }
  }
  for (const [fill, inkTok] of Object.entries(FILLS)) {
    const r = ratio(hex(t[fill]), hex(t[inkTok]));
    const ok = r >= 4.5;
    if (!ok) failures++;
    console.log(
      `  ${ok ? "OK  " : "FAIL"} ${inkTok} on ${fill}: ${r.toFixed(2)}:1 (min 4.5)`,
    );
  }
}
console.log(
  failures ? `\n${failures} contrast failure(s)` : "\nAll pairs pass WCAG AA",
);
process.exit(failures ? 1 : 0);
