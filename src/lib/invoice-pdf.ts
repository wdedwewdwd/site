import "server-only";
import path from "node:path";
import sharp from "sharp";
import { faDigits, toman } from "./format";
import type { Invoice, InvoiceLine, InvoiceTone } from "./invoice";
import { A4, baselineOffset, PdfDocument, type PdfImage, type PdfPage, type TextStyle } from "./pdf";

/** The invoice as an A4 PDF (see lib/invoice.ts for what it says). Long orders continue on more pages. */

const C = {
  ink: "#1a1d20",
  muted: "#5f666d",
  line: "#dee2e6",
  soft: "#f1f3f5",
  canvas: "#f8f9fa",
  night: "#191919",
  white: "#ffffff",
  brand: "#d52222",
};
const TONE: Record<InvoiceTone, { bg: string; fg: string }> = {
  green: { bg: "#ebfbee", fg: "#237534" },
  red: { bg: "#fdeaea", fg: "#d52222" },
  amber: { bg: "#fef3c7", fg: "#b45309" },
  gray: { bg: "#f1f3f5", fg: "#5f666d" },
};

const { width: W, height: H } = A4;
const M = 34; // page margin
const R = W - M; // right edge: Persian lines start here
const L = M;
const CW = W - 2 * M;
const BOTTOM = H - M - 24; // content stops here; the footer goes below
const GAP = 12;

const LABEL: TextStyle = { font: "regular", size: 8.5 };
const VALUE: TextStyle = { font: "regular", size: 9 };
const LINE = 14;

/** Baseline of a text line of `size` centred in a box from `top` with height `height`. */
const mid = (top: number, height: number, size: number) => top + height / 2 + baselineOffset(size);

let logoCache: Promise<{ rgb: Buffer; alpha: Buffer; width: number; height: number }> | null = null;
/** The logo (yellow, on a transparent background) as pixels, made once per server process. */
function logoPixels() {
  logoCache ??= sharp(path.join(process.cwd(), "public", "brand", "logo.svg"), { density: 12 })
    .resize({ width: 300 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      const count = info.width * info.height;
      const rgb = Buffer.alloc(count * 3);
      const alpha = Buffer.alloc(count);
      for (let i = 0; i < count; i++) {
        rgb[i * 3] = data[i * 4];
        rgb[i * 3 + 1] = data[i * 4 + 1];
        rgb[i * 3 + 2] = data[i * 4 + 2];
        alpha[i] = data[i * 4 + 3];
      }
      return { rgb, alpha, width: info.width, height: info.height };
    })
    .catch((e) => {
      logoCache = null;
      throw e;
    });
  return logoCache;
}

/** "label: value" rows with the values in one column; long values wrap under themselves. */
function keyValues(doc: PdfDocument, rows: InvoiceLine[], width: number) {
  const labelWidth = Math.max(0, ...rows.map((r) => doc.width(`${r.label}:`, LABEL))) + 6;
  const laid = rows.map((r) => ({ ...r, lines: doc.wrap(r.value, { ...VALUE, dir: r.ltr ? "ltr" : "rtl" }, width - labelWidth) }));
  return {
    height: laid.reduce((h, r) => h + r.lines.length * LINE, 0),
    draw(page: PdfPage, right: number, top: number) {
      let y = top;
      for (const r of laid) {
        page.text(`${r.label}:`, right, mid(y, LINE, VALUE.size), { ...LABEL, color: C.muted });
        r.lines.forEach((line, i) =>
          page.text(line, right - labelWidth, mid(y + i * LINE, LINE, VALUE.size), { ...VALUE, dir: r.ltr ? "ltr" : "rtl", color: C.ink }),
        );
        y += r.lines.length * LINE;
      }
    },
  };
}

/** Two boxes side by side (the right one first), each a title and "label: value" rows. */
function boxPair(doc: PdfDocument, boxes: [{ title: string; rows: InvoiceLine[] }, { title: string; rows: InvoiceLine[] }]) {
  const width = (CW - GAP) / 2;
  const pad = 10;
  const laid = boxes.map((b) => ({ ...b, kv: keyValues(doc, b.rows, width - 2 * pad) }));
  const height = Math.max(...laid.map((b) => b.kv.height)) + 2 * pad + 20;
  return {
    height,
    /** Draws the pair at `top`; returns the y below it. */
    draw(page: PdfPage, top: number) {
      laid.forEach((b, i) => {
        const right = R - i * (width + GAP);
        page.rect(right - width, top, width, height, { stroke: C.line, radius: 8 });
        page.rect(right - pad - 3, top + pad + 4, 3, 11, { fill: C.brand, radius: 1 });
        page.text(b.title, right - pad - 8, mid(top + pad, 18, 10), { font: "bold", size: 10, color: C.ink });
        b.kv.draw(page, right - pad, top + pad + 20);
      });
      return top + height;
    },
  };
}

function header(doc: PdfDocument, page: PdfPage, inv: Invoice, logo: PdfImage | null) {
  // Shop: the logo on a dark tile (the yellow mark is hard to see on white), the name beside it.
  const tile = 52;
  page.rect(R - tile, M, tile, tile, { fill: C.night, radius: 14 });
  if (logo) {
    const lw = 38;
    const lh = (lw * logo.height) / logo.width;
    page.image(logo, R - tile + (tile - lw) / 2, M + (tile - lh) / 2, lw, lh);
  }
  const nameRight = R - tile - 10;
  page.text(inv.seller.name, nameRight, M + 22, { font: "black", size: 17, color: C.ink });
  page.text(inv.seller.latinName, nameRight, M + 36, { size: 7.5, dir: "ltr", color: C.muted });
  page.text(inv.seller.website, nameRight, M + 48, { size: 8, dir: "ltr", color: C.muted });

  // Title and payment status in the middle.
  page.text(inv.title, W / 2, M + 24, { font: "black", size: 20, color: C.ink, align: "center" });
  const tone = TONE[inv.status.tone];
  const pill = { font: "bold", size: 8.5 } as const;
  const pillWidth = doc.width(inv.status.label, pill) + 22;
  page.rect(W / 2 - pillWidth / 2, M + 33, pillWidth, 17, { fill: tone.bg, radius: 8.5 });
  page.text(inv.status.label, W / 2, mid(M + 33, 17, pill.size), { ...pill, color: tone.fg, align: "center" });

  // Number and date on the left.
  const box = { width: 182, height: 46 };
  page.rect(L, M + 3, box.width, box.height, { stroke: C.line, radius: 8 });
  const rows: [string, string][] = [
    [`شماره ${inv.title}`, inv.number],
    ["تاریخ صدور", inv.issued],
  ];
  rows.forEach(([label, value], i) => {
    const top = M + 3 + 6 + i * 17;
    page.text(`${label}:`, L + box.width - 10, mid(top, 17, 8.5), { ...LABEL, size: 8, color: C.muted });
    page.text(value, L + 10, mid(top, 17, 8.5), { font: "bold", size: 8.5, color: C.ink, align: "left" });
  });

  const y = M + tile + 12;
  page.line(L, y, R, y, { color: C.ink, width: 1.2 });
  return y + 12;
}

/** The order's facts in one grey band of equal cells. */
function metaBand(doc: PdfDocument, page: PdfPage, top: number, cells: InvoiceLine[]) {
  const cell = CW / cells.length;
  const style = { font: "bold", size: 9 } as const;
  const values = cells.map((c) => doc.wrap(c.value, style, cell - 20));
  const height = 24 + Math.max(...values.map((v) => v.length)) * 13 + 6;
  page.rect(L, top, CW, height, { fill: C.canvas, stroke: C.line, radius: 8 });
  cells.forEach((c, i) => {
    const right = R - i * cell;
    if (i > 0) page.line(right, top + 8, right, top + height - 8, { color: C.line });
    page.text(c.label, right - 10, mid(top + 6, 16, 8), { ...LABEL, size: 8, color: C.muted });
    values[i].forEach((line, k) => page.text(line, right - 10, mid(top + 22 + k * 13, 13, style.size), { ...style, color: C.ink }));
  });
  return top + height;
}

const COLUMNS = [
  { title: "ردیف", width: 28 },
  { title: "شرح کالا", width: 0 }, // the rest
  { title: "کد کالا", width: 92 },
  { title: "تعداد", width: 34 },
  { title: "مبلغ واحد (تومان)", width: 80 },
  { title: "مبلغ کل (تومان)", width: 86 },
];
COLUMNS[1].width = CW - COLUMNS.reduce((s, c) => s + c.width, 0);
/** Right edge of each column. */
const COL_RIGHT = COLUMNS.map((_, i) => R - COLUMNS.slice(0, i).reduce((s, c) => s + c.width, 0));

const ROW: TextStyle = { font: "regular", size: 9 };
const ROW_LINE = 13.5;
const CELL_PAD = 6.5;

function tableHeader(page: PdfPage, top: number) {
  const height = 26;
  page.rect(L, top, CW, height, { fill: C.soft, radius: 0 });
  COLUMNS.forEach((c, i) => {
    page.text(c.title, COL_RIGHT[i] - c.width / 2, mid(top, height, 8.5), { font: "bold", size: 8.5, color: C.ink, align: "center" });
  });
  return top + height;
}

/** Outer frame and column lines of the part of the table on one page. */
function tableFrame(page: PdfPage, top: number, bottom: number) {
  for (let i = 1; i < COLUMNS.length; i++) page.line(COL_RIGHT[i], top, COL_RIGHT[i], bottom, { color: C.line });
  page.rect(L, top, CW, bottom - top, { stroke: C.line, radius: 0 });
}

function stamp(page: PdfPage, text: string) {
  page.translucent(0.16, () =>
    page.rotated(W / 2, H / 2, 28, () => {
      const size = 74;
      const width = page.text(text, W / 2, H / 2 + baselineOffset(size), { font: "black", size, color: C.brand, align: "center" }) + 90;
      page.rect(W / 2 - width / 2, H / 2 - 62, width, 124, { stroke: C.brand, lineWidth: 5, radius: 22 });
    }),
  );
}

/** The PDF as a download (or, with `inline`, shown in the browser's PDF viewer). Never cached: it holds personal data. */
export function pdfResponse(pdf: Buffer, fileName: string, inline = false) {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${fileName}"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function renderInvoicePdf(inv: Invoice) {
  const doc = new PdfDocument({ title: `${inv.title} ${inv.number} — ${inv.seller.name}`, author: inv.seller.name, subject: `سفارش ${inv.number}` });
  const pixels = await logoPixels().catch(() => null);
  const logo = pixels && doc.addImage(pixels.rgb, pixels.alpha, pixels.width, pixels.height);

  let page = doc.addPage();
  let y = header(doc, page, inv, logo);
  y = boxPair(doc, [
    { title: "مشخصات فروشنده", rows: [{ label: "نام فروشگاه", value: inv.seller.name }, ...inv.seller.lines] },
    { title: "مشخصات خریدار", rows: inv.buyer },
  ]).draw(page, y);
  y = metaBand(doc, page, y + GAP, inv.meta) + GAP + 2;

  // Items: rows that do not fit go on the next page, under the column titles again.
  const continued = () => {
    page = doc.addPage();
    page.text(`${inv.title} شماره ${inv.number} (ادامه)`, R, M + 12, { font: "bold", size: 10, color: C.ink });
    page.line(L, M + 22, R, M + 22, { color: C.line });
    return M + 34;
  };
  let tableTop = y;
  y = tableHeader(page, y);
  inv.items.forEach((item, index) => {
    const name = doc.wrap(item.name, ROW, COLUMNS[1].width - 2 * CELL_PAD);
    const sku = doc.wrap(item.sku, { ...ROW, dir: "ltr" }, COLUMNS[2].width - 2 * CELL_PAD);
    const height = Math.max(name.length, sku.length) * ROW_LINE + 2 * CELL_PAD;
    if (y + height > BOTTOM) {
      tableFrame(page, tableTop, y);
      tableTop = continued();
      y = tableHeader(page, tableTop);
    }
    if (index % 2 === 1) page.rect(L, y, CW, height, { fill: C.canvas });
    if (index > 0) page.line(L, y, R, y, { color: C.line });
    const centre = (i: number) => COL_RIGHT[i] - COLUMNS[i].width / 2;
    const middle = mid(y, height, ROW.size);
    page.text(faDigits(index + 1), centre(0), middle, { ...ROW, color: C.muted, align: "center" });
    name.forEach((line, k) => page.text(line, COL_RIGHT[1] - CELL_PAD, mid(y + CELL_PAD + k * ROW_LINE, ROW_LINE, ROW.size), { ...ROW, color: C.ink }));
    const skuTop = y + (height - sku.length * ROW_LINE) / 2;
    sku.forEach((line, k) => page.text(line, centre(2), mid(skuTop + k * ROW_LINE, ROW_LINE, ROW.size), { ...ROW, dir: "ltr", color: C.ink, align: "center" }));
    page.text(faDigits(item.quantity), centre(3), middle, { ...ROW, color: C.ink, align: "center" });
    page.text(toman(item.unitPrice), centre(4), middle, { ...ROW, color: C.ink, align: "center" });
    page.text(toman(item.total), centre(5), middle, { font: "bold", size: 9, color: C.ink, align: "center" });
    y += height;
  });
  tableFrame(page, tableTop, y);
  y += GAP + 4;

  // Totals on the left, the amount in words (and the customer's note) on the right; kept together on one page.
  const totalsWidth = 240;
  const totalRow = 32;
  // A long label (e.g. a long discount code) wraps beside its amount instead of running into it.
  const sumValue = { font: "bold", size: 9 } as const;
  const sumLabel = { size: 8.8 } as const;
  const sums = inv.sums.map((s) => {
    const lines = doc.wrap(s.label, sumLabel, totalsWidth - 24 - doc.width(s.value, sumValue) - 12);
    return { ...s, lines, height: Math.max(23, lines.length * 12.5 + 10) };
  });
  const totalsHeight = sums.reduce((h, s) => h + s.height, 0) + totalRow;
  const sideWidth = CW - totalsWidth - GAP;
  const words = doc.wrap(inv.total.words, { font: "bold", size: 9.5 }, sideWidth - 24);
  const note = inv.customerNote ? doc.wrap(inv.customerNote, VALUE, sideWidth - 24) : [];
  const sideHeight = 22 + words.length * LINE + 12 + (note.length ? 22 + note.length * LINE + 12 + GAP : 0);
  if (y + Math.max(totalsHeight, sideHeight) > BOTTOM) y = continued();

  page.rect(L, y, totalsWidth, totalsHeight, { stroke: C.line, radius: 8 });
  let top = y;
  sums.forEach((s, i) => {
    if (i > 0) page.line(L, top, L + totalsWidth, top, { color: C.line });
    const first = top + (s.height - s.lines.length * 12.5) / 2;
    s.lines.forEach((line, k) => page.text(line, L + totalsWidth - 12, mid(first + k * 12.5, 12.5, sumLabel.size), { ...sumLabel, color: C.muted }));
    page.text(s.value, L + 12, mid(top, s.height, sumValue.size), { ...sumValue, color: s.discount ? C.brand : C.ink, align: "left" });
    top += s.height;
  });
  const totalTop = top;
  page.rect(L, totalTop, totalsWidth, totalRow, { fill: C.ink, radius: 8 });
  page.text(inv.total.label, L + totalsWidth - 12, mid(totalTop, totalRow, 10), { font: "bold", size: 10, color: C.white });
  page.text(inv.total.value, L + 12, mid(totalTop, totalRow, 11.5), { font: "black", size: 11.5, color: C.white, align: "left" });

  let side = y;
  page.rect(R - sideWidth, side, sideWidth, 22 + words.length * LINE + 12, { fill: C.canvas, stroke: C.line, radius: 8 });
  page.text("مبلغ به حروف", R - 12, mid(side + 6, 16, 8.5), { ...LABEL, color: C.muted });
  words.forEach((line, k) => page.text(line, R - 12, mid(side + 22 + k * LINE, LINE, 9.5), { font: "bold", size: 9.5, color: C.ink }));
  side += 22 + words.length * LINE + 12;
  if (note.length) {
    side += GAP;
    page.rect(R - sideWidth, side, sideWidth, 22 + note.length * LINE + 12, { stroke: C.line, radius: 8 });
    page.text("توضیحات سفارش", R - 12, mid(side + 6, 16, 8.5), { ...LABEL, color: C.muted });
    note.forEach((line, k) => page.text(line, R - 12, mid(side + 22 + k * LINE, LINE, VALUE.size), { ...VALUE, color: C.ink }));
  }
  y += Math.max(totalsHeight, sideHeight) + GAP;

  // Payment and delivery details.
  const details = boxPair(doc, [
    { title: "اطلاعات پرداخت", rows: inv.payment },
    { title: "اطلاعات ارسال", rows: inv.shipment },
  ]);
  if (y + details.height > BOTTOM) y = continued();
  y = details.draw(page, y) + GAP;

  // Notes.
  const notes = inv.notes.flatMap((text) => doc.wrap(text, { size: 7.8 }, CW - 12).map((line, i) => ({ line, first: i === 0 })));
  if (y + notes.length * 12.5 > BOTTOM) y = continued();
  notes.forEach(({ line, first }) => {
    if (first) page.rect(R - 4, y + 5, 3, 3, { fill: C.muted, radius: 1.5 });
    page.text(line, R - 10, mid(y, 12.5, 7.8), { size: 7.8, color: C.muted });
    y += 12.5;
  });

  // Footer on every page; the stamp goes over everything, see-through.
  const phone = inv.seller.lines.find((l) => l.label === "تلفن")?.value;
  doc.pages.forEach((p, i) => {
    const top = H - M - 16;
    p.line(L, top, R, top, { color: C.line });
    // «|» rather than «·», which reads like a Persian zero next to numbers.
    p.text([inv.seller.name, inv.seller.website, phone && `تلفن ${phone}`].filter(Boolean).join("   |   "), R, top + 13, { size: 7.5, color: C.muted });
    p.text(`صفحه ${faDigits(i + 1)} از ${faDigits(doc.pages.length)}`, L, top + 13, { size: 7.5, color: C.muted, align: "left" });
    if (inv.stamp) stamp(p, inv.stamp);
  });

  return doc.toBuffer();
}
