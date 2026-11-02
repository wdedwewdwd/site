import "server-only";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import bidiFactory from "bidi-js";
import * as fontkit from "fontkit";

/**
 * A small PDF writer for the documents the shop hands out (invoices), without a PDF library: none of them shapes
 * Persian correctly. Text is shaped by fontkit (joined letter forms, «لا») and put in visual order with the Unicode
 * bidi algorithm (bidi-js), so mixed Persian / Latin / number text reads as it does in the browser. Fonts are
 * embedded as subsets with a ToUnicode map, and each text run carries its logical text (/ActualText), so the file
 * can be searched and copied from.
 *
 * Coordinates are points from the page's top-left corner, y going down; text is placed by its baseline.
 */

export const A4 = { width: 595.28, height: 841.89 };

// Vazirmatn, the site's font, in the "FD" cut: every digit is drawn Persian, as the site does with `ss01`.
const FONT_FILES = {
  regular: "Vazirmatn-FD-Regular.ttf",
  bold: "Vazirmatn-FD-Bold.ttf",
  black: "Vazirmatn-FD-Black.ttf",
} as const;
export type FontName = keyof typeof FONT_FILES;
export type Dir = "rtl" | "ltr";
export type Align = "right" | "left" | "center";
export type TextStyle = { font?: FontName; size: number; dir?: Dir };

const loaded = new Map<FontName, fontkit.Font>();
function loadFont(name: FontName) {
  let font = loaded.get(name);
  if (!font) {
    font = fontkit.create(readFileSync(path.join(process.cwd(), "assets", "fonts", FONT_FILES[name]))) as fontkit.Font;
    loaded.set(name, font);
  }
  return font;
}

/** Distance from a line's visual middle down to its baseline (all three cuts share the vertical metrics). */
export function baselineOffset(size: number) {
  const font = loadFont("regular");
  return (size * (font.ascent + font.descent)) / 2 / font.unitsPerEm;
}

const bidi = bidiFactory();
// Format characters steer the bidi algorithm but have no glyph. ZWNJ and ZWJ stay: they decide how letters join.
const INVISIBLE = /[​‎‏‪-‮⁠-⁤⁦-⁩﻿]/g;
const clean = (text: string) => text.replace(/[\r\n\t]+/g, " ").replace(/[\u0000-\u001f\u007f-\u009f]/g, "");

type Placed = { glyph: fontkit.Glyph; x: number; y: number };
type Shaped = { glyphs: Placed[]; width: number }; // font units, x from the line's left edge

function shape(font: fontkit.Font, input: string, dir: Dir): Shaped {
  const text = clean(input);
  if (!text) return { glyphs: [], width: 0 };
  const { levels } = bidi.getEmbeddingLevels(text, dir);
  const chars = text.split("");
  // Brackets and «» at right-to-left levels are drawn mirrored, as in the browser.
  for (const [i, mirror] of bidi.getMirroredCharactersMap(text, levels)) chars[i] = mirror;

  // Runs of one embedding level, then rule L2 of the bidi algorithm: from the highest level down to the lowest odd
  // one, reverse every sequence of runs at that level or above. fontkit lays each run out in its own direction.
  const runs: { text: string; level: number }[] = [];
  for (let i = 0; i < chars.length; ) {
    let j = i + 1;
    while (j < chars.length && levels[j] === levels[i]) j++;
    runs.push({ text: chars.slice(i, j).join(""), level: levels[i] });
    i = j;
  }
  const max = Math.max(...runs.map((r) => r.level));
  const min = Math.min(...runs.map((r) => r.level));
  for (let level = max; level >= (min % 2 ? min : min + 1); level--) {
    for (let i = 0; i < runs.length; ) {
      if (runs[i].level < level) {
        i++;
        continue;
      }
      let j = i;
      while (j < runs.length && runs[j].level >= level) j++;
      runs.splice(i, j - i, ...runs.slice(i, j).reverse());
      i = j;
    }
  }

  const glyphs: Placed[] = [];
  let x = 0;
  for (const run of runs) {
    const str = run.text.replace(INVISIBLE, "");
    if (!str) continue;
    const rtl = run.level % 2 === 1;
    const laid = font.layout(str, [], rtl ? "arab" : "latn", undefined, rtl ? "rtl" : "ltr");
    laid.glyphs.forEach((glyph, k) => {
      const p = laid.positions[k];
      // Glyph 0 is the font's "missing" box (e.g. an emoji): leave the gap rather than draw a box.
      if (glyph.id !== 0) glyphs.push({ glyph, x: x + p.xOffset, y: p.yOffset });
      x += p.xAdvance;
    });
  }
  return { glyphs, width: x };
}

/** A font as used in one document: the glyphs drawn so far become its embedded subset. */
class EmbeddedFont {
  readonly subset: fontkit.Subset;
  readonly widths = new Map<number, number>(); // subset glyph id → advance (1/1000 em)
  readonly unicode = new Map<number, string>(); // subset glyph id → text it stands for
  private ids = new Map<number, number>();

  constructor(
    readonly key: string,
    readonly font: fontkit.Font,
  ) {
    this.subset = font.createSubset();
  }

  use(glyph: fontkit.Glyph) {
    let id = this.ids.get(glyph.id);
    if (id === undefined) {
      // fontkit returns the glyph's id in the subset (its types say boolean).
      id = this.subset.includeGlyph(glyph) as unknown as number;
      this.ids.set(glyph.id, id);
      this.widths.set(id, Math.round((glyph.advanceWidth * 1000) / this.font.unitsPerEm));
      if (glyph.codePoints.length) this.unicode.set(id, String.fromCodePoint(...glyph.codePoints));
    }
    return id;
  }
}

export type PdfImage = { key: string; width: number; height: number; rgb: Buffer; alpha: Buffer | null };

export class PdfDocument {
  readonly pages: PdfPage[] = [];
  private fonts = new Map<FontName, EmbeddedFont>();
  private images: PdfImage[] = [];
  private shapes = new Map<string, Shaped>();

  constructor(private info: { title: string; author: string; subject?: string }) {}

  addPage(width = A4.width, height = A4.height) {
    const page = new PdfPage(this, width, height);
    this.pages.push(page);
    return page;
  }

  /** An 8-bit RGB picture, with an optional 8-bit alpha channel of the same size. */
  addImage(rgb: Buffer, alpha: Buffer | null, width: number, height: number) {
    const image: PdfImage = { key: `Im${this.images.length + 1}`, width, height, rgb, alpha };
    this.images.push(image);
    return image;
  }

  shaped(text: string, font: FontName, dir: Dir) {
    const key = `${font}|${dir}|${text}`;
    let shaped = this.shapes.get(key);
    if (!shaped) {
      shaped = shape(loadFont(font), text, dir);
      this.shapes.set(key, shaped);
    }
    return shaped;
  }

  embed(name: FontName) {
    let font = this.fonts.get(name);
    if (!font) {
      font = new EmbeddedFont(`F${this.fonts.size + 1}`, loadFont(name));
      this.fonts.set(name, font);
    }
    return font;
  }

  width(text: string, style: TextStyle) {
    const font = loadFont(style.font ?? "regular");
    return (this.shaped(text, style.font ?? "regular", style.dir ?? "rtl").width * style.size) / font.unitsPerEm;
  }

  /** Breaks text into lines no wider than maxWidth, at spaces and line breaks; a word too long by itself is cut. */
  wrap(text: string, style: TextStyle, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split(/\r?\n/).map(clean)) {
      let line = "";
      for (const word of paragraph.split(" ").filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (this.width(candidate, style) <= maxWidth) {
          line = candidate;
          continue;
        }
        if (line) lines.push(line);
        line = word;
        while (line.length > 1 && this.width(line, style) > maxWidth) {
          let cut = line.length - 1;
          while (cut > 1 && this.width(line.slice(0, cut), style) > maxWidth) cut--;
          // Codes like "XU7-TIMING-KIT" break best just after a hyphen, slash, underscore or dot that still fits.
          const soft = Math.max(...["-", "/", "_", "."].map((c) => line.lastIndexOf(c, cut - 1))) + 1;
          if (soft > cut / 3) cut = soft;
          lines.push(line.slice(0, cut));
          line = line.slice(cut);
        }
      }
      lines.push(line);
    }
    return lines;
  }

  toBuffer() {
    const w = new ObjectWriter();
    const catalog = w.alloc();
    const pagesId = w.alloc();
    const infoId = w.alloc();
    const fontIds = new Map([...this.fonts.values()].map((f) => [f, w.alloc()]));
    const imageIds = new Map(this.images.map((img) => [img, w.alloc()]));
    const pageIds = this.pages.map(() => w.alloc());

    // Pages are laid out right to left, like a Persian book.
    w.add(catalog, `<< /Type /Catalog /Pages ${ref(pagesId)} /Lang (fa-IR) /ViewerPreferences << /Direction /R2L /DisplayDocTitle true >> >>`);
    w.add(pagesId, `<< /Type /Pages /Kids [${pageIds.map(ref).join(" ")}] /Count ${pageIds.length} >>`);
    w.add(
      infoId,
      `<< /Title ${utf16(this.info.title)} /Author ${utf16(this.info.author)}${this.info.subject ? ` /Subject ${utf16(this.info.subject)}` : ""} /Producer ${utf16(this.info.author)} /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}Z) >>`,
    );
    this.pages.forEach((page, i) => {
      const content = w.alloc();
      w.stream(content, "", Buffer.from(page.content(), "latin1"));
      const fonts = [...page.fonts].map((f) => `/${f.key} ${ref(fontIds.get(f)!)}`).join(" ");
      const images = [...page.images].map((img) => `/${img.key} ${ref(imageIds.get(img)!)}`).join(" ");
      const fontDict = fonts ? ` /Font << ${fonts} >>` : "";
      const forms = page.forms.map((form) => {
        const id = w.alloc();
        w.stream(
          id,
          `/Type /XObject /Subtype /Form /BBox [0 0 ${n(page.width)} ${n(page.height)}] /Group << /S /Transparency >> /Resources <<${fontDict}${images ? ` /XObject << ${images} >>` : ""} >>`,
          Buffer.from(form.content, "latin1"),
        );
        return `/${form.key} ${ref(id)}`;
      });
      const xobjects = [images, ...forms].filter(Boolean).join(" ");
      const states = [...page.opacities].map(([key, a]) => `/${key} << /Type /ExtGState /ca ${n4(a)} /CA ${n4(a)} >>`).join(" ");
      w.add(
        pageIds[i],
        `<< /Type /Page /Parent ${ref(pagesId)} /MediaBox [0 0 ${n(page.width)} ${n(page.height)}] /Resources << /ProcSet [/PDF /Text /ImageC]${fontDict}${xobjects ? ` /XObject << ${xobjects} >>` : ""}${states ? ` /ExtGState << ${states} >>` : ""} >> /Contents ${ref(content)} >>`,
      );
    });
    [...fontIds].forEach(([font, id], i) => writeFont(w, font, id, i));
    for (const [image, id] of imageIds) writeImage(w, image, id);
    return w.finish(catalog, infoId);
  }
}

export class PdfPage {
  readonly fonts = new Set<EmbeddedFont>();
  readonly images = new Set<PdfImage>();
  readonly opacities = new Map<string, number>();
  readonly forms: { key: string; content: string }[] = [];
  private ops: string[] = [];

  constructor(
    private doc: PdfDocument,
    readonly width: number,
    readonly height: number,
  ) {}

  /**
   * One line of text with its baseline at y. x is the right edge for align "right" (the default, as Persian text
   * starts on the right), the left edge for "left" and the middle for "center". Returns the text's width.
   */
  text(text: string, x: number, y: number, style: TextStyle & { color?: string; align?: Align }) {
    const name = style.font ?? "regular";
    const shaped = this.doc.shaped(text, name, style.dir ?? "rtl");
    const font = this.doc.embed(name);
    const scale = style.size / font.font.unitsPerEm;
    const width = shaped.width * scale;
    if (!shaped.glyphs.length) return width;
    const align = style.align ?? "right";
    const left = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
    const baseline = this.height - y;
    this.fonts.add(font);
    const out = [`/Span << /ActualText ${utf16(clean(text))} >> BDC`, "BT", `${rgb(style.color ?? "#000000")} rg`, `/${font.key} ${n(style.size)} Tf`];
    for (const g of shaped.glyphs) out.push(`1 0 0 1 ${n(left + g.x * scale)} ${n(baseline + g.y * scale)} Tm <${hex4(font.use(g.glyph))}> Tj`);
    out.push("ET", "EMC");
    this.ops.push(out.join("\n"));
    return width;
  }

  rect(x: number, y: number, w: number, h: number, style: { fill?: string; stroke?: string; lineWidth?: number; radius?: number }) {
    const paint = style.fill && style.stroke ? "B" : style.fill ? "f" : "S";
    const colors = `${style.fill ? `${rgb(style.fill)} rg ` : ""}${style.stroke ? `${rgb(style.stroke)} RG ${n(style.lineWidth ?? 0.75)} w ` : ""}`;
    this.ops.push(`q ${colors}${roundedRect(x, this.height - y - h, w, h, style.radius ?? 0)} ${paint} Q`);
  }

  line(x1: number, y1: number, x2: number, y2: number, style: { color: string; width?: number; dash?: [number, number] }) {
    const dash = style.dash ? `[${style.dash.map(n).join(" ")}] 0 d ` : "";
    this.ops.push(`q ${rgb(style.color)} RG ${n(style.width ?? 0.75)} w ${dash}${n(x1)} ${n(this.height - y1)} m ${n(x2)} ${n(this.height - y2)} l S Q`);
  }

  image(image: PdfImage, x: number, y: number, w: number, h: number) {
    this.images.add(image);
    this.ops.push(`q ${n(w)} 0 0 ${n(h)} ${n(x)} ${n(this.height - y - h)} cm /${image.key} Do Q`);
  }

  /**
   * Whatever `draw` adds is see-through (alpha 0 invisible, 1 solid). It is painted as one group, so shapes that
   * overlap each other (joined letters) do not show darker where they meet.
   */
  translucent(alpha: number, draw: () => void) {
    const state = `GS${Math.round(alpha * 1000)}`;
    this.opacities.set(state, alpha);
    const outer = this.ops;
    this.ops = [];
    draw();
    const form = { key: `Fm${this.forms.length + 1}`, content: this.content() };
    this.forms.push(form);
    this.ops = outer;
    this.ops.push(`q /${state} gs /${form.key} Do Q`);
  }

  /** Whatever `draw` adds is turned by `degrees` (counter-clockwise) around (cx, cy). */
  rotated(cx: number, cy: number, degrees: number, draw: () => void) {
    const a = (degrees * Math.PI) / 180;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const [px, py] = [cx, this.height - cy];
    this.ops.push(`q ${n4(c)} ${n4(s)} ${n4(-s)} ${n4(c)} ${n(px - c * px + s * py)} ${n(py - s * px - c * py)} cm`);
    draw();
    this.ops.push("Q");
  }

  content() {
    return this.ops.join("\n");
  }
}

/* ----------------------------------------------------------------------------------------------------------------- */

class ObjectWriter {
  private parts: Buffer[] = [];
  private size = 0;
  private offsets: number[] = [];
  private next = 1;

  constructor() {
    // The second line's high bytes tell tools the file is binary.
    this.push(Buffer.from("%PDF-1.7\n%âãÏÓ\n", "latin1"));
  }

  alloc() {
    return this.next++;
  }

  add(id: number, body: string) {
    this.offsets[id] = this.size;
    this.push(Buffer.from(`${id} 0 obj\n${body}\nendobj\n`, "latin1"));
  }

  stream(id: number, dict: string, data: Buffer) {
    const packed = deflateSync(data);
    this.offsets[id] = this.size;
    this.push(Buffer.from(`${id} 0 obj\n<< ${dict}${dict ? " " : ""}/Filter /FlateDecode /Length ${packed.length} >>\nstream\n`, "latin1"));
    this.push(packed);
    this.push(Buffer.from("\nendstream\nendobj\n", "latin1"));
  }

  finish(root: number, info: number) {
    const start = this.size;
    const rows = ["xref", `0 ${this.next}`, "0000000000 65535 f "];
    for (let id = 1; id < this.next; id++) {
      if (this.offsets[id] === undefined) throw new Error(`PDF object ${id} was never written`);
      rows.push(`${String(this.offsets[id]).padStart(10, "0")} 00000 n `);
    }
    const fileId = randomBytes(16).toString("hex");
    rows.push("trailer", `<< /Size ${this.next} /Root ${ref(root)} /Info ${ref(info)} /ID [<${fileId}> <${fileId}>] >>`, "startxref", String(start), "%%EOF", "");
    this.push(Buffer.from(rows.join("\n"), "latin1"));
    return Buffer.concat(this.parts);
  }

  private push(part: Buffer) {
    this.parts.push(part);
    this.size += part.length;
  }
}

function writeFont(w: ObjectWriter, font: EmbeddedFont, id: number, index: number) {
  // Subset fonts are named with six capital letters and "+".
  const name = `ARZYD${String.fromCharCode(65 + index)}+${font.font.postscriptName}`;
  const scale = 1000 / font.font.unitsPerEm;
  const { minX, minY, maxX, maxY } = font.font.bbox;
  const [cid, descriptor, file, toUnicode] = [w.alloc(), w.alloc(), w.alloc(), w.alloc()];
  const widths = [...font.widths].sort((a, b) => a[0] - b[0]).map(([gid, width]) => `${gid} [${width}]`);
  const data = Buffer.from(font.subset.encode());

  w.add(id, `<< /Type /Font /Subtype /Type0 /BaseFont /${name} /Encoding /Identity-H /DescendantFonts [${ref(cid)}] /ToUnicode ${ref(toUnicode)} >>`);
  w.add(
    cid,
    `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${ref(descriptor)} /DW 0 /W [${widths.join(" ")}] /CIDToGIDMap /Identity >>`,
  );
  w.add(
    descriptor,
    `<< /Type /FontDescriptor /FontName /${name} /Flags 4 /FontBBox [${[minX, minY, maxX, maxY].map((v) => Math.round(v * scale)).join(" ")}] /ItalicAngle 0 /Ascent ${Math.round(font.font.ascent * scale)} /Descent ${Math.round(font.font.descent * scale)} /CapHeight ${Math.round(font.font.capHeight * scale)} /StemV 80 /FontFile2 ${ref(file)} >>`,
  );
  w.stream(file, `/Length1 ${data.length}`, data);

  const entries = [...font.unicode].sort((a, b) => a[0] - b[0]);
  const blocks: string[] = [];
  for (let i = 0; i < entries.length; i += 100) {
    const chunk = entries.slice(i, i + 100);
    blocks.push(`${chunk.length} beginbfchar\n${chunk.map(([gid, text]) => `<${hex4(gid)}> <${utf16Hex(text)}>`).join("\n")}\nendbfchar`);
  }
  const cmap = [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
    "/CMapName /Adobe-Identity-UCS def",
    "/CMapType 2 def",
    "1 begincodespacerange",
    "<0000> <FFFF>",
    "endcodespacerange",
    ...blocks,
    "endcmap",
    "CMapName currentdict /CMap defineresource pop",
    "end",
    "end",
  ];
  w.stream(toUnicode, "", Buffer.from(cmap.join("\n"), "latin1"));
}

function writeImage(w: ObjectWriter, image: PdfImage, id: number) {
  const base = `/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /BitsPerComponent 8`;
  let mask = "";
  if (image.alpha) {
    const maskId = w.alloc();
    w.stream(maskId, `${base} /ColorSpace /DeviceGray`, image.alpha);
    mask = ` /SMask ${ref(maskId)}`;
  }
  w.stream(id, `${base} /ColorSpace /DeviceRGB${mask}`, image.rgb);
}

function roundedRect(x: number, y: number, w: number, h: number, radius: number) {
  const r = Math.min(radius, w / 2, h / 2);
  if (r <= 0) return `${n(x)} ${n(y)} ${n(w)} ${n(h)} re`;
  const k = r * 0.5523; // Bézier handle length for a quarter circle
  return [
    `${n(x + r)} ${n(y)} m`,
    `${n(x + w - r)} ${n(y)} l`,
    `${n(x + w - r + k)} ${n(y)} ${n(x + w)} ${n(y + r - k)} ${n(x + w)} ${n(y + r)} c`,
    `${n(x + w)} ${n(y + h - r)} l`,
    `${n(x + w)} ${n(y + h - r + k)} ${n(x + w - r + k)} ${n(y + h)} ${n(x + w - r)} ${n(y + h)} c`,
    `${n(x + r)} ${n(y + h)} l`,
    `${n(x + r - k)} ${n(y + h)} ${n(x)} ${n(y + h - r + k)} ${n(x)} ${n(y + h - r)} c`,
    `${n(x)} ${n(y + r)} l`,
    `${n(x)} ${n(y + r - k)} ${n(x + r - k)} ${n(y)} ${n(x + r)} ${n(y)} c`,
    "h",
  ].join(" ");
}

const ref = (id: number) => `${id} 0 R`;
const round = (v: number, places: number) => {
  const r = Math.round(v * 10 ** places) / 10 ** places;
  return Object.is(r, -0) ? "0" : String(r);
};
const n = (v: number) => round(v, 2);
const n4 = (v: number) => round(v, 4);
const hex4 = (v: number) => v.toString(16).toUpperCase().padStart(4, "0");
const utf16Hex = (text: string) => Array.from({ length: text.length }, (_, i) => hex4(text.charCodeAt(i))).join("");
/** A PDF text string in UTF-16 (any language), written in hex so the file stays ASCII. */
const utf16 = (text: string) => `<FEFF${utf16Hex(text)}>`;

function rgb(hex: string) {
  const v = Number.parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => n4(c / 255)).join(" ");
}
