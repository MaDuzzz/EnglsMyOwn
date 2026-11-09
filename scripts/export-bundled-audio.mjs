import ExcelJS from "exceljs";
import { readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceDir = resolve(root, "../vocab_data");
const files = readdirSync(sourceDir).filter((name) =>
  /(_on_demand_v3|_on_demand_v4|_enriched_on_demand_v2)\.xlsx$/.test(name),
);
if (files.length !== 6)
  throw Error(`Expected six enriched workbooks, found ${files.length}.`);

const entries = {};
for (const name of files) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(join(sourceDir, name));
  const sheet = workbook.worksheets[0];
  const headers = sheet.getRow(1).values;
  const column = (key) => {
    const index = headers.indexOf(key);
    if (index < 1) throw Error(`${name}: missing ${key}`);
    return index;
  };
  const idColumn = column("id");
  const textColumn = column("headword");
  const modeColumn = column("audioMode");
  const statusColumn = column("status");
  sheet.eachRow((row, number) => {
    if (number === 1 || row.getCell(statusColumn).text !== "published") return;
    if (row.getCell(modeColumn).text !== "on-demand") return;
    const id = row.getCell(idColumn).text.trim();
    const text = row.getCell(textColumn).text.trim();
    if (!/^[-\w]+$/.test(id) || !text || entries[id]) {
      throw Error(`${name} row ${number}: invalid or duplicate audio entry`);
    }
    entries[id] = text;
  });
}

const sorted = Object.fromEntries(
  Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(
  join(root, "src/data/bundledAudio.json"),
  `${JSON.stringify(sorted, null, 2)}\n`,
);
console.log(
  `Prepared ${Object.keys(sorted).length} audio entries from ${files.length} workbooks.`,
);
