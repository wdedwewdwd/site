import "server-only";
import { strFromU8, unzipSync } from "fflate";

/**
 * Reads the first sheet of an .xlsx file as rows of cell values (text or number). Enough for files saved by
 * Excel, LibreOffice or Google Sheets: shared and inline strings, numbers, formula results. Never evaluates
 * anything; unknown parts of the file are ignored.
 */

export type SheetCell = string | number | null;
/** rows[i][j] = row i+1, column j+1 (A = 0); missing cells are null. */
export type SheetRows = SheetCell[][];

const MAX_PART_BYTES = 40 * 1024 * 1024; // uncompressed size of any one part we read (zip-bomb guard)
const MAX_ROWS = 20_000;
const MAX_COLS = 50;

export class XlsxReadError extends Error {}

const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    const k = e.toLowerCase();
    if (k === "amp") return "&";
    if (k === "lt") return "<";
    if (k === "gt") return ">";
    if (k === "quot") return '"';
    if (k === "apos") return "'";
    const code = k.startsWith("#x") ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
    return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  });
const attr = (attrs: string, name: string) => attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
// Tag names may carry a namespace prefix (e.g. <x:c>) in files from some tools.
const P = "(?:[\\w-]+:)?";
const textOf = (xml: string) => [...xml.matchAll(new RegExp(`<${P}t(?:\\s[^>]*)?>([\\s\\S]*?)</${P}t>`, "g"))].map((m) => decode(m[1])).join("");

function colIndex(ref: string) {
  const letters = ref.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? "";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function resolveTarget(target: string) {
  const t = target.replace(/^\//, "");
  return t.startsWith("xl/") ? t : `xl/${t.replace(/^\.\//, "")}`;
}

export function readFirstSheet(file: Uint8Array): SheetRows {
  let parts: Record<string, Uint8Array>;
  try {
    parts = unzipSync(file, {
      filter: (f) =>
        f.originalSize <= MAX_PART_BYTES &&
        (f.name === "xl/workbook.xml" || f.name === "xl/_rels/workbook.xml.rels" || f.name === "xl/sharedStrings.xml" || /^xl\/worksheets\/[^/]+\.xml$/.test(f.name)),
    });
  } catch {
    throw new XlsxReadError("فایل اکسل (xlsx) معتبر نیست.");
  }
  const workbook = parts["xl/workbook.xml"] && strFromU8(parts["xl/workbook.xml"]);
  if (!workbook) throw new XlsxReadError("فایل اکسل (xlsx) معتبر نیست.");

  // First sheet in the workbook's tab order → its file through the relationships part.
  const firstSheet = workbook.match(new RegExp(`<${P}sheet\\s([^>]*?)/?>`))?.[1] ?? "";
  const relId = firstSheet.match(/(?:^|\s)[\w-]*:?id="([^"]*)"/)?.[1];
  const rels = parts["xl/_rels/workbook.xml.rels"] ? strFromU8(parts["xl/_rels/workbook.xml.rels"]) : "";
  const rel = [...rels.matchAll(new RegExp(`<${P}Relationship\\s([^>]*?)/?>`, "g"))].map((m) => m[1]).find((a) => attr(a, "Id") === relId);
  const sheetPath = rel ? resolveTarget(attr(rel, "Target") ?? "") : "xl/worksheets/sheet1.xml";
  const sheet = parts[sheetPath] && strFromU8(parts[sheetPath]);
  if (!sheet) throw new XlsxReadError("برگه‌ی اول فایل اکسل خوانده نشد.");

  const shared = parts["xl/sharedStrings.xml"]
    ? [...strFromU8(parts["xl/sharedStrings.xml"]).matchAll(new RegExp(`<${P}si>([\\s\\S]*?)</${P}si>`, "g"))].map((m) =>
        // Phonetic runs (<rPh>) are hints, not part of the text.
        textOf(m[1].replace(new RegExp(`<${P}rPh[\\s\\S]*?</${P}rPh>`, "g"), "")),
      )
    : [];

  const rows: SheetRows = [];
  const rowRe = new RegExp(`<${P}row\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${P}row>)`, "g");
  const cellRe = new RegExp(`<${P}c\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${P}c>)`, "g");
  let nextRow = 0;
  for (const rm of sheet.matchAll(rowRe)) {
    const r = Number(attr(rm[1], "r"));
    const rowIdx = Number.isInteger(r) && r > 0 ? r - 1 : nextRow;
    nextRow = rowIdx + 1;
    if (rowIdx >= MAX_ROWS) throw new XlsxReadError("فایل بیش از حد ردیف دارد.");
    const row: SheetCell[] = [];
    let nextCol = 0;
    for (const cm of (rm[2] ?? "").matchAll(cellRe)) {
      const ref = attr(cm[1], "r");
      const col = ref ? colIndex(ref) : nextCol;
      nextCol = col + 1;
      if (col < 0 || col >= MAX_COLS) continue;
      const type = attr(cm[1], "t") ?? "n";
      const inner = cm[2] ?? "";
      const v = inner.match(new RegExp(`<${P}v(?:\\s[^>]*)?>([\\s\\S]*?)</${P}v>`))?.[1];
      let value: SheetCell = null;
      if (type === "s") value = v !== undefined ? (shared[Number(v)] ?? null) : null;
      else if (type === "inlineStr") value = textOf(inner);
      else if (type === "str" || type === "e" || type === "d") value = v !== undefined ? decode(v) : null;
      else if (type === "b") value = v === "1" ? "TRUE" : v === "0" ? "FALSE" : null;
      else if (v !== undefined && v.trim() !== "") {
        const n = Number(v);
        value = Number.isFinite(n) ? n : decode(v);
      }
      row[col] = value;
    }
    rows[rowIdx] = Array.from({ length: row.length }, (_, j) => row[j] ?? null);
  }
  return Array.from({ length: rows.length }, (_, i) => rows[i] ?? []);
}
