import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { describe, it, expect } from "vitest";
import pilot from "../content/vocabulary-pilot-v2.json";
import { workbookContent, readVocabularyXlsx } from "../src/lib/xlsx-import";
import { storedWord } from "../src/lib/content";

const bytes = readFileSync("outputs/firebase-xlsx/vocabulary-v2.xlsx");
async function book() {
  const b = new ExcelJS.Workbook();
  await b.xlsx.load(bytes);
  return b;
}
const withoutEmpty = (v: any): any =>
  Array.isArray(v)
    ? v.map(withoutEmpty)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.entries(v)
            .filter(([, value]) => value !== "" && value != null)
            .map(([k, value]) => [k, withoutEmpty(value)]),
        )
      : v;

describe("XLSX vocabulary import", () => {
  it("reads the delivered workbook and preserves all canonical vocabulary and audio fields", async () => {
    const result = await readVocabularyXlsx(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );
    expect(result.words).toHaveLength(10);
    expect(withoutEmpty(result.words.map(storedWord))).toEqual(
      withoutEmpty(pilot.words),
    );
    expect(result.lessons).toEqual([]);
  });
  it("rejects unknown columns and old workbook layouts instead of silently losing data", async () => {
    const b = await book();
    b.getWorksheet("Words")!.getCell("B1").value = "typo";
    expect(() => workbookContent(b)).toThrow(/Words!B1.*unknown/);
    b.removeWorksheet("Words");
    expect(() => workbookContent(b)).toThrow(/Missing sheet/);
  });
  it("reports orphaned child rows and duplicate pronunciations", async () => {
    const b = await book();
    b.getWorksheet("Examples")!.getCell("A2").value = "missing";
    expect(() => workbookContent(b)).toThrow(/Examples row 2.*missing/);
    const c = await book();
    const sheet = c.getWorksheet("Pronunciations")!;
    sheet.addRow(sheet.getRow(2).values);
    expect(() => workbookContent(c)).toThrow(/duplicate accent/);
  });
  it("rejects formulas even with cached results and rejects duplicate IDs", async () => {
    const b = await book();
    b.getWorksheet("Words")!.getCell("B2").value = {
      formula: '"take a risk"',
      result: "take a risk",
    };
    expect(() => workbookContent(b)).toThrow(/Words!B2.*plain text/);
    const c = await book();
    c.getWorksheet("Words")!.getCell("A3").value = "colloc-031";
    expect(() => workbookContent(c)).toThrow(/Words row 3.*duplicate/);
  });
  it("maps content validation failures to the original Words row", async () => {
    const b = await book();
    b.getWorksheet("Words")!.getCell("G3").value = "";
    expect(() => workbookContent(b)).toThrow(/Words row 3.*missing meaningVi/);
  });
});
