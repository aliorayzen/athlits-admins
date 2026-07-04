import { readFile, writeFile } from "node:fs/promises";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error(
    "Usage: node scripts/generate-lebanon-locations.mjs <input.txt> <output.json>",
  );
  process.exit(1);
}

const raw = await readFile(inputPath, "utf8");
const rows = [];

for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.includes("|")) continue;

  const parts = trimmed.split("|");
  if (parts.length < 5) continue;

  const latitude = Number.parseFloat(parts[3]);
  const longitude = Number.parseFloat(parts[4]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

  rows.push({
    name: parts[0].trim(),
    city: parts[1].trim(),
    governorate: parts[2].trim(),
    latitude,
    longitude,
    aliases: (parts[5] ?? "")
      .split(",")
      .map((alias) => alias.trim())
      .filter(Boolean),
  });
}

await writeFile(outputPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
console.log(`Wrote ${rows.length} rows to ${outputPath}`);
