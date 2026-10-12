import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "./db";
import { UPLOAD_DIR } from "./uploads";
import { PRODUCT_VIEWS, productOrder, productWhere, type ProductFilters } from "./admin-products";

/** Upper bound for one export, far above the catalogue size. */
export const EXPORT_LIMIT = 5000;

/** Every product matching the admin list's filters (all pages, not just one), in the list's order. */
export function exportProducts(f: ProductFilters) {
  return db.product.findMany({
    where: productWhere(f),
    orderBy: productOrder(f),
    take: EXPORT_LIMIT,
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
  });
}
export type ExportProduct = Awaited<ReturnType<typeof exportProducts>>[number];

/** Plain-language summary of the active filters ("دسته: جلوبندی · ناموجود"), empty when exporting everything. */
export async function exportFilterLabel(f: ProductFilters) {
  const [category, brand] = await Promise.all([
    f.category ? db.category.findUnique({ where: { id: f.category }, select: { name: true } }) : null,
    f.brand ? db.brand.findUnique({ where: { id: f.brand }, select: { name: true } }) : null,
  ]);
  return [
    f.q && `جستجو: «${f.q}»`,
    category && `دسته: ${category.name}`,
    brand && `برند: ${brand.name}`,
    f.view !== "all" && PRODUCT_VIEWS[f.view].label,
  ]
    .filter(Boolean)
    .join(" · ");
}

const UPLOADED = /^\/media\/products\/([A-Za-z0-9_-]{16,64}\.webp)$/;
const BUILT_IN = /^\/images\/products\/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp)$/;

/** Where a product photo lives on disk: an upload, or one of the built-in sample photos. */
function photoFile(url: string) {
  const up = UPLOADED.exec(url);
  if (up) return path.join(UPLOAD_DIR, "products", up[1]);
  if (BUILT_IN.test(url)) return path.join(process.cwd(), "public", url);
  return null;
}

/**
 * Small JPEG of a product photo for a spreadsheet (Excel can't show webp). Made at twice the shown size so it
 * stays sharp when zoomed; returns the size to show it at. Null when the photo is missing or unreadable.
 */
export async function photoThumb(url: string, box: { width: number; height: number }) {
  const file = photoFile(url);
  if (!file) return null;
  try {
    const { data, info } = await sharp(await readFile(file), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(box.width * 2, box.height * 2, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    return { jpeg: new Uint8Array(data), width: Math.max(1, Math.round(info.width / 2)), height: Math.max(1, Math.round(info.height / 2)) };
  } catch {
    return null;
  }
}

/** Runs `fn` over `items` with at most `limit` running at once, keeping the order of results. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
