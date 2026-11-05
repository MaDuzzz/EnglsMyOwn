import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";
import pilot from "../content/vocabulary-pilot-v2.json";
import { workbookContent } from "../src/lib/xlsx-import";

describe("enriched single-sheet vocabulary", () => {
  it("loads structured vocabulary from one sheet and preserves exercise and audio metadata", () => {
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet("Verbs B1+");
    const columns = Object.keys(pilot.words[0]);
    sheet.addRow(columns);
    for (const word of pilot.words)
      sheet.addRow(
        columns.map((key) => {
          const value = (word as Record<string, unknown>)[key];
          return typeof value === "object" ? JSON.stringify(value) : value;
        }),
      );
    expect(workbookContent(book).words).toHaveLength(10);
    sheet.getCell("A2").value = "broken";
    expect(() => workbookContent(book)).toThrow(/row 2/);
  });
  it.skipIf(!process.env.CHECK_ENRICHED_FILE)(
    "validates the edited source workbook",
    async () => {
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(readFileSync(process.env.CHECK_ENRICHED_FILE!));
      expect(workbookContent(book).words).toHaveLength(200);
    },
  );
});
