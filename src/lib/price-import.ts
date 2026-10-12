import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";
import { faDigits } from "./format";
import { toEnDigits } from "./validation";
import type { SheetCell, SheetRows } from "./xlsx-read";

/** Same bounds as the product form; the upper one keeps prices inside the database's integer column. */
export const MIN_PRICE = 1000;
export const MAX_PRICE = 2_000_000_000;

export type PriceChange = { id: string; sku: string; name: string; from: number; to: number };
export type PriceProblem = { row: number; sku: string; message: string };
export type PricePlan = {
  changes: PriceChange[];
  problems: PriceProblem[];
  /** Rows whose «قیمت جدید» is empty or equal to the current price. */
  unchanged: number;
  /** Fingerprint of `changes`, so "apply" changes exactly what the preview showed. */
  digest: string;
};

const norm = (s: string) => toEnDigits(s).replace(/‌/g, " ").replace(/[()]/g, " ").replace(/\s+/g, " ").trim();

/** Finds the header row and the «کد کالا» / «قیمت جدید» columns (by title, so moved columns still work). */
function findColumns(rows: SheetRows) {
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const titles = rows[r].map((c) => (typeof c === "string" ? norm(c) : ""));
    const sku = titles.findIndex((t) => t.startsWith("کد کالا"));
    const price = titles.findIndex((t) => t.startsWith("قیمت جدید"));
    if (sku >= 0 && price >= 0) return { headerRow: r, sku, price };
  }
  return null;
}

/** Turns what the owner typed into toman, accepting Persian/Arabic digits, separators and «تومان». */
export function parsePrice(cell: SheetCell): { value: number | null } | { error: string } {
  if (cell === null) return { value: null };
  if (typeof cell === "number") {
    const n = Math.round(cell);
    if (Math.abs(cell - n) > 1e-6) return { error: "قیمت باید عدد صحیح (بدون اعشار) باشد" };
    return checkRange(n);
  }
  const s = toEnDigits(cell)
    .replace(/تومان/g, "")
    .replace(/[\s,٬،'’_]/g, "")
    .trim();
  if (s === "") return { value: null };
  if (!/^\d{1,12}$/.test(s)) return { error: `«${cell.trim().slice(0, 30)}» عدد نیست` };
  return checkRange(Number(s));
}
function checkRange(n: number): { value: number } | { error: string } {
  if (n < MIN_PRICE) return { error: "قیمت باید حداقل ۱۰۰۰ تومان باشد" };
  if (n > MAX_PRICE) return { error: "قیمت بیش از حد بزرگ است" };
  return { value: n };
}

const skuOf = (cell: SheetCell) => (cell === null ? "" : toEnDigits(String(cell)).trim().toUpperCase());

/**
 * Compares the sheet with the database: which products get a new price, which rows are skipped and why.
 * Discounted products follow the inline price edit's rule: the paid price must stay below the struck-through one.
 */
export async function planPriceImport(rows: SheetRows): Promise<PricePlan | { error: string }> {
  const cols = findColumns(rows);
  if (!cols) return { error: "ستون‌های «کد کالا» و «قیمت جدید» در فایل پیدا نشد. از همان فایلی استفاده کنید که با «دریافت خروجی → فایل اکسل» گرفته‌اید." };

  type Entry = { row: number; sku: string; price: number };
  const entries: Entry[] = [];
  const problems: PriceProblem[] = [];
  let unchanged = 0;
  for (let r = cols.headerRow + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const sku = skuOf(row[cols.sku] ?? null);
    const parsed = parsePrice(row[cols.price] ?? null);
    if (!sku) {
      if ("error" in parsed || parsed.value !== null) problems.push({ row: r + 1, sku: "", message: "کد کالا خالی است" });
      continue;
    }
    if ("error" in parsed) problems.push({ row: r + 1, sku, message: parsed.error });
    else if (parsed.value === null) unchanged++;
    else entries.push({ row: r + 1, sku, price: parsed.value });
  }

  // The same code twice with different prices is ambiguous: skip it (identical repeats are fine).
  const bySku = new Map<string, Entry[]>();
  for (const e of entries) bySku.set(e.sku, [...(bySku.get(e.sku) ?? []), e]);
  const products = await db.product.findMany({
    where: { sku: { in: [...bySku.keys()] } },
    select: { id: true, sku: true, name: true, price: true, compareAtPrice: true },
  });
  const found = new Map(products.map((p) => [p.sku.toUpperCase(), p]));

  const changes: PriceChange[] = [];
  for (const [sku, list] of bySku) {
    const first = list[0];
    if (new Set(list.map((e) => e.price)).size > 1) {
      problems.push({ row: first.row, sku, message: `این کد در ردیف‌های ${list.map((e) => faDigits(e.row)).join("، ")} با قیمت‌های مختلف آمده است` });
      continue;
    }
    const p = found.get(sku);
    if (!p) problems.push({ row: first.row, sku, message: "محصولی با این کد در سایت نیست" });
    else if (p.price === first.price) unchanged++;
    else if (p.compareAtPrice !== null && first.price >= p.compareAtPrice)
      problems.push({ row: first.row, sku, message: "این محصول تخفیف دارد؛ قیمت جدید باید کمتر از قیمت خط‌خورده باشد (از صفحه‌ی محصول تغییر دهید)" });
    else changes.push({ id: p.id, sku: p.sku, name: p.name, from: p.price, to: first.price });
  }

  problems.sort((a, b) => a.row - b.row);
  changes.sort((a, b) => a.sku.localeCompare(b.sku));
  const digest = createHash("sha256").update(JSON.stringify(changes.map((c) => [c.id, c.from, c.to]))).digest("hex");
  return { changes, problems, unchanged, digest };
}
