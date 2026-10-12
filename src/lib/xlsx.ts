import "server-only";
import { strToU8, zipSync, type Zippable } from "fflate";

/**
 * Minimal Excel (.xlsx) writer: one right-to-left sheet with a styled header row, text and number cells, and an
 * optional photo inside the first cell of each row. Photos "move and size with cells", so Excel's own sorting
 * and filtering keep each photo next to its row.
 */

export type XlsxStyle = "text" | "code" | "money" | "input" | "note";
export type XlsxColumn = { title: string; width: number; style: XlsxStyle };
/** A JPEG shown at `width`×`height` screen pixels (the file itself may be larger, for sharpness). */
export type XlsxImage = { jpeg: Uint8Array; width: number; height: number; alt: string };
export type XlsxRow = { cells: (string | number | null)[]; image?: XlsxImage | null };
export type XlsxSheet = {
  name: string;
  title: string;
  columns: XlsxColumn[];
  rows: XlsxRow[];
  rowHeight: number; // points
  footer?: string;
};

const STYLE_ID: Record<XlsxStyle | "header", number> = { header: 1, text: 2, code: 3, money: 4, input: 5, note: 6 };
const HEADER_HEIGHT = 30; // points
const EMU_PER_PX = 9525;
const MDW = 7; // max digit width (px) of the default font, Calibri 11, which Excel uses to size columns

const xml = (s: string) =>
  s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const colName = (i: number): string => (i < 26 ? String.fromCharCode(65 + i) : colName(Math.floor(i / 26) - 1) + colName(i % 26));
const colPx = (width: number) => Math.trunc(((256 * width + Math.trunc(128 / MDW)) / 256) * MDW);
const ptToPx = (pt: number) => Math.round((pt * 96) / 72);
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";

function cell(ref: string, value: string | number | null, style: number) {
  if (value === null || value === "") return `<c r="${ref}" s="${style}"/>`;
  if (typeof value === "number") return Number.isFinite(value) ? `<c r="${ref}" s="${style}"><v>${value}</v></c>` : `<c r="${ref}" s="${style}"/>`;
  // Inline strings are always stored as text, never evaluated as a formula.
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}

const STYLES = `${HEAD}<styleSheet xmlns="${NS_MAIN}">
<fonts count="4">
<font><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/><family val="2"/></font>
<font><sz val="11"/><color rgb="FF191919"/><name val="Tahoma"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Tahoma"/><family val="2"/></font>
<font><sz val="9"/><color rgb="FF8A8A8A"/><name val="Tahoma"/><family val="2"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF191919"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF6D5"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFD9D9D9"/></left><right style="thin"><color rgb="FFD9D9D9"/></right><top style="thin"><color rgb="FFD9D9D9"/></top><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1" readingOrder="2"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1" readingOrder="2"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="3" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="3" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1" readingOrder="2"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="0"/>
<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;

export function buildXlsx(sheet: XlsxSheet, now = new Date()): Uint8Array {
  const cols = sheet.columns;
  const lastCol = colName(cols.length - 1);
  const lastRow = sheet.rows.length + 1;
  const quoted = `'${sheet.name.replace(/'/g, "''")}'`;
  const images = sheet.rows.flatMap((r, i) => (r.image ? [{ row: i + 1, ...r.image }] : []));

  const rowsXml = [
    `<row r="1" ht="${HEADER_HEIGHT}" customHeight="1">${cols.map((c, j) => cell(`${colName(j)}1`, c.title, STYLE_ID.header)).join("")}</row>`,
    ...sheet.rows.map((r, i) => {
      const n = i + 2;
      return `<row r="${n}" ht="${sheet.rowHeight}" customHeight="1">${cols.map((c, j) => cell(`${colName(j)}${n}`, r.cells[j] ?? null, STYLE_ID[c.style])).join("")}</row>`;
    }),
  ].join("");

  const sheetXml = `${HEAD}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${lastCol}${lastRow}"/>
<sheetViews><sheetView rightToLeft="1" tabSelected="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols.map((c, j) => `<col min="${j + 1}" max="${j + 1}" width="${c.width}" customWidth="1"/>`).join("")}</cols>
<sheetData>${rowsXml}</sheetData>
<autoFilter ref="A1:${lastCol}${lastRow}"/>
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>
${sheet.footer ? `<headerFooter><oddFooter>${xml(sheet.footer)}</oddFooter></headerFooter>` : ""}
${images.length ? '<drawing r:id="rId1"/>' : ""}
</worksheet>`;

  // Each photo is centred inside its cell in the first column.
  const cellW = colPx(cols[0].width);
  const cellH = ptToPx(sheet.rowHeight);
  const anchors = images.map((img, k) => {
    const w = Math.min(img.width, cellW - 4);
    const h = Math.min(img.height, cellH - 4);
    const x = Math.round((cellW - w) / 2) * EMU_PER_PX;
    const y = Math.round((cellH - h) / 2) * EMU_PER_PX;
    const cx = w * EMU_PER_PX;
    const cy = h * EMU_PER_PX;
    return `<xdr:twoCellAnchor>
<xdr:from><xdr:col>0</xdr:col><xdr:colOff>${x}</xdr:colOff><xdr:row>${img.row}</xdr:row><xdr:rowOff>${y}</xdr:rowOff></xdr:from>
<xdr:to><xdr:col>0</xdr:col><xdr:colOff>${x + cx}</xdr:colOff><xdr:row>${img.row}</xdr:row><xdr:rowOff>${y + cy}</xdr:rowOff></xdr:to>
<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${k + 2}" name="Picture ${k + 1}" descr="${xml(img.alt)}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>
<xdr:blipFill><a:blip r:embed="rId${k + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>
<xdr:clientData/>
</xdr:twoCellAnchor>`;
  });

  const files: Zippable = {
    "[Content_Types].xml": strToU8(`${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
${images.length ? '<Default Extension="jpeg" ContentType="image/jpeg"/>' : ""}
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${images.length ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : ""}
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`),
    "_rels/.rels": strToU8(`${HEAD}<Relationships xmlns="${NS_PKG_REL}">
<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`),
    "docProps/core.xml": strToU8(`${HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xml(sheet.title)}</dc:title>
<dcterms:created xsi:type="dcterms:W3CDTF">${now.toISOString().replace(/\.\d+Z$/, "Z")}</dcterms:created>
</cp:coreProperties>`),
    "xl/workbook.xml": strToU8(`${HEAD}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">
<bookViews><workbookView activeTab="0"/></bookViews>
<sheets><sheet name="${xml(sheet.name)}" sheetId="1" r:id="rId1"/></sheets>
<definedNames>
<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${xml(quoted)}!$A$1:$${lastCol}$${lastRow}</definedName>
<definedName name="_xlnm.Print_Titles" localSheetId="0">${xml(quoted)}!$1:$1</definedName>
</definedNames>
</workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`${HEAD}<Relationships xmlns="${NS_PKG_REL}">
<Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="${NS_REL}/styles" Target="styles.xml"/>
</Relationships>`),
    "xl/styles.xml": strToU8(STYLES),
    "xl/worksheets/sheet1.xml": strToU8(sheetXml),
  };
  if (images.length) {
    files["xl/worksheets/_rels/sheet1.xml.rels"] = strToU8(`${HEAD}<Relationships xmlns="${NS_PKG_REL}">
<Relationship Id="rId1" Type="${NS_REL}/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`);
    files["xl/drawings/drawing1.xml"] = strToU8(
      `${HEAD}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${NS_REL}">\n${anchors.join("\n")}\n</xdr:wsDr>`,
    );
    files["xl/drawings/_rels/drawing1.xml.rels"] = strToU8(
      `${HEAD}<Relationships xmlns="${NS_PKG_REL}">\n${images.map((_, k) => `<Relationship Id="rId${k + 1}" Type="${NS_REL}/image" Target="../media/image${k + 1}.jpeg"/>`).join("\n")}\n</Relationships>`,
    );
    // Photos are already compressed; storing them as-is keeps the export fast.
    images.forEach((img, k) => (files[`xl/media/image${k + 1}.jpeg`] = [img.jpeg, { level: 0 }]));
  }
  return zipSync(files, { level: 6 });
}
