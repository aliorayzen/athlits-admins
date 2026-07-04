import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataPath = path.join(root, "src", "lib", "lebanon-locations-data.json");

const rows = JSON.parse(await readFile(dataPath, "utf8"));

assert.ok(Array.isArray(rows), "catalogue should be an array");
assert.ok(rows.length > 3000, "catalogue should include the full Lebanon set");

const governorates = new Set(rows.map((row) => row.governorate));
for (const governorate of [
  "Akkar",
  "Beirut",
  "Mount Lebanon",
  "North Lebanon",
  "South Lebanon",
]) {
  assert.ok(governorates.has(governorate), `missing ${governorate}`);
}

const saida = rows.find(
  (row) =>
    row.name === "Saida" &&
    row.city === "Saida" &&
    row.governorate === "South Lebanon",
);
assert.ok(saida, "Saida should map to Saida / South Lebanon");
assert.equal(typeof saida.latitude, "number");
assert.equal(typeof saida.longitude, "number");

const sour = rows.find(
  (row) =>
    row.name === "Sour" &&
    row.city === "South Lebanon" &&
    row.governorate === "South Lebanon" &&
    row.aliases.includes("Tyre"),
);
assert.ok(sour, "Sour should keep Tyre as a searchable alias");

const mountLebanonLocations = rows.filter(
  (row) => row.governorate === "Mount Lebanon",
);
assert.ok(
  mountLebanonLocations.length > 1000,
  "Mount Lebanon should keep supplied location coverage",
);

console.log(
  `Verified ${rows.length} Lebanon locations across ${governorates.size} governorates.`,
);
