import type { Workbook, CellValue } from "exceljs";
import schema from "./xlsx-schema.json";
import { validateImport } from "./content";

type Row = { line: number; values: Record<string, string> };
const lines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

function cellText(value: CellValue, location: string): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    if (text.length > 32000) throw Error(`${location}: cell is too long.`);
    return text;
  }
  if (typeof value === "object" && "richText" in value)
    return cellText(value.richText.map((p) => p.text).join(""), location);
  if (typeof value === "object" && "hyperlink" in value)
    return cellText(value.text, location);
  throw Error(`${location}: use plain text, not a formula or Excel error.`);
}

export function workbookContent(book: Workbook) {
  if (book.worksheets.length === 1) {
    const sheet = book.worksheets[0];
    const columns: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => {
      columns[col - 1] = cellText(cell.value, `${sheet.name}!${cell.address}`);
    });
    if (columns.includes("schemaVersion")) {
      if (sheet.rowCount > 401 || sheet.columnCount > 60)
        throw Error("Import at most 400 entries and 60 columns.");
      if (new Set(columns).size !== columns.length)
        throw Error("Duplicate column headers.");
      const structured = new Set([
        "topicIds",
        "tags",
        "commonPatterns",
        "forms",
        "commonMistakes",
        "relatedExpressions",
        "acceptedSpellings",
        "meaningDistractorsVi",
        "examples",
        "pronunciation",
        "recall",
      ]);
      const words: unknown[] = [];
      sheet.eachRow((row, line) => {
        if (line === 1) return;
        if (
          !row.values ||
          !Object.values(row.values).some(
            (value) => value != null && String(value).trim(),
          )
        )
          return;
        const value: Record<string, unknown> = {};
        columns.forEach((name, col) => {
          const raw = cellText(
            row.getCell(col + 1).value,
            `${sheet.name} row ${line}, ${name}`,
          );
          if (structured.has(name)) {
            try {
              value[name] = JSON.parse(raw);
            } catch {
              throw Error(
                `${sheet.name} row ${line}: ${name} must contain valid JSON.`,
              );
            }
          } else
            value[name] = ["schemaVersion", "contentVersion"].includes(name)
              ? Number(raw)
              : raw;
        });
        if (!value.id && !value.headword) return;
        try {
          validateImport({ words: [value] });
        } catch (e) {
          throw Error(`${sheet.name} row ${line}: ${(e as Error).message}`);
        }
        words.push(value);
      });
      if (!words.length) throw Error("Provide at least one vocabulary entry.");
      return validateImport({ words });
    }
  }
  if (book.worksheets.length === 1 && !book.getWorksheet("Words")) {
    const sheet = book.worksheets[0];
    const headers = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, col) => {
      const name = cellText(cell.value, `${sheet.name}!${cell.address}`);
      if (headers.has(name))
        throw Error(`${sheet.name}: duplicate column ${name}.`);
      headers.set(name, col);
    });
    const required = [
      "id",
      "headword",
      "meaningEn",
      "meaningVi",
      "textEn",
      "gapTemplate",
      "audioUS",
      "audioUK",
    ];
    if (required.every((name) => headers.has(name))) {
      let count = 0,
        missingAudio = 0;
      sheet.eachRow((row, line) => {
        if (line === 1) return;
        const word = cellText(
          row.getCell(headers.get("headword")!).value,
          `${sheet.name} row ${line}`,
        );
        if (!word) return;
        count++;
        const audio = ["audioUS", "audioUK"].map((name) =>
          cellText(
            row.getCell(headers.get(name)!).value,
            `${sheet.name} row ${line}`,
          ),
        );
        if (!audio.some((url) => /^https:\/\//i.test(url))) missingAudio++;
      });
      throw Error(
        `Recognized single-sheet vocabulary format: ${count} entries. ${missingAudio} entries have no HTTPS audio URL. These source files also need exercise and pronunciation review before they can be imported. No content was saved.`,
      );
    }
  }
  const tables: Record<string, Row[]> = {};
  for (const sheet of book.worksheets) {
    if (sheet.name !== "Readme" && !(sheet.name in schema))
      throw Error(
        `Unknown sheet "${sheet.name}". Use the vocabulary v2 XLSX template.`,
      );
  }
  for (const [name, columns] of Object.entries(schema)) {
    const sheet = book.getWorksheet(name);
    if (!sheet)
      throw Error(
        `Missing sheet "${name}". Use the vocabulary v2 XLSX template.`,
      );
    if (sheet.rowCount > 5001 || sheet.columnCount > 60)
      throw Error(`${name}: maximum 5,000 rows and 60 columns.`);
    const headers: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      const header = cellText(cell.value, `${name}!${cell.address}`);
      if (!columns.includes(header) || headers.includes(header))
        throw Error(
          `${name}!${cell.address}: unknown or duplicate column "${header}".`,
        );
      headers[col - 1] = header;
    });
    for (const col of columns)
      if (!headers.includes(col))
        throw Error(`${name}: missing column ${col}.`);
    tables[name] = [];
    sheet.eachRow((row, line) => {
      if (line === 1) return;
      const values: Record<string, string> = {};
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const value = cellText(cell.value, `${name}!${cell.address}`);
        if (!headers[col - 1] && value)
          throw Error(`${name}!${cell.address}: missing column header.`);
        if (headers[col - 1]) values[headers[col - 1]] = value;
      });
      for (const header of headers) values[header] ??= "";
      if (Object.values(values).some(Boolean))
        tables[name].push({ line, values });
    });
  }
  if (!tables.Words.length || tables.Words.length > 400)
    throw Error("Words: provide between 1 and 400 entries per file.");
  const words = new Map<string, any>();
  const positions = new Map<string, number>();
  for (const { line, values: r } of tables.Words) {
    if (!/^[-a-zA-Z0-9_]+$/.test(r.id) || words.has(r.id))
      throw Error(`Words row ${line}: invalid or duplicate id "${r.id}".`);
    const { recallPromptVi, recallAnswers, recallExplanationVi, ...base } = r;
    words.set(r.id, {
      ...base,
      schemaVersion: 2,
      contentVersion: Number(r.contentVersion),
      topicIds: lines(r.topicIds),
      tags: lines(r.tags),
      commonPatterns: lines(r.commonPatterns),
      acceptedSpellings: lines(r.acceptedSpellings),
      meaningDistractorsVi: lines(r.meaningDistractorsVi),
      recall: {
        promptVi: recallPromptVi,
        acceptedAnswers: lines(recallAnswers),
        explanationVi: recallExplanationVi,
      },
      examples: [],
      pronunciation: {},
      forms: [],
      commonMistakes: [],
      relatedExpressions: [],
    });
    positions.set(r.id, line);
  }
  for (const name of Object.keys(schema).filter((n) => n !== "Words")) {
    for (const { line, values: r } of tables[name]) {
      const w = words.get(r.wordId);
      if (!w)
        throw Error(
          `${name} row ${line}: wordId "${r.wordId}" is not in Words.`,
        );
      const { wordId, ...fields } = r;
      if (name === "Examples") {
        const {
          gapTemplate,
          gapAnswers,
          gapExplanationVi,
          sentenceTokens,
          arrangementAnswers,
          ...example
        } = fields;
        w.examples.push({
          ...example,
          ...(gapTemplate || gapAnswers || gapExplanationVi
            ? {
                gap: {
                  template: gapTemplate,
                  acceptedAnswers: lines(gapAnswers),
                  explanationVi: gapExplanationVi,
                },
              }
            : {}),
          ...(sentenceTokens ? { sentenceTokens: lines(sentenceTokens) } : {}),
          ...(arrangementAnswers
            ? { arrangementAnswers: lines(arrangementAnswers) }
            : {}),
        });
      } else if (name === "Pronunciations") {
        const { accent, ...p } = fields;
        if (!["au", "uk", "us"].includes(accent) || w.pronunciation[accent])
          throw Error(
            `Pronunciations row ${line}: invalid or duplicate accent "${accent}" for ${wordId}.`,
          );
        w.pronunciation[accent] = p;
      } else if (name === "Forms") w.forms.push(fields);
      else if (name === "Mistakes") w.commonMistakes.push(fields);
      else {
        const { relatedWordId, ...related } = fields;
        w.relatedExpressions.push({
          ...related,
          ...(relatedWordId ? { wordId: relatedWordId } : {}),
        });
      }
    }
  }
  const errors: string[] = [];
  for (const w of words.values()) {
    try {
      validateImport({ words: [w] });
    } catch (e) {
      errors.push(`Words row ${positions.get(w.id)}: ${(e as Error).message}`);
    }
  }
  if (errors.length)
    throw Error(
      errors.slice(0, 20).join("\n") +
        (errors.length > 20
          ? `\n…${errors.length - 20} more entries need correction.`
          : ""),
    );
  return validateImport({ words: [...words.values()] });
}

export async function readVocabularyXlsx(bytes: ArrayBuffer) {
  if (bytes.byteLength > 5 * 1024 * 1024)
    throw Error("Use an XLSX file smaller than 5 MB.");
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.load(bytes);
  } catch {
    throw Error(
      "Could not read this workbook. Save it as .xlsx without a password.",
    );
  }
  return workbookContent(book);
}
