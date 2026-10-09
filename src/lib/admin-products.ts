import "server-only";
import { idSchema } from "./validation";
import type { Prisma } from "@/generated/prisma/client";

export const PRODUCTS_PAGE_SIZE = 50;

/** Tabs above the admin product list; each shows how many products it holds. */
export const PRODUCT_VIEWS = {
  all: { label: "همه", where: {} },
  active: { label: "فعال", where: { isActive: true } },
  inactive: { label: "غیرفعال", where: { isActive: false } },
  out: { label: "ناموجود", where: { stock: 0 } },
  low: { label: "رو به اتمام", where: { stock: { gt: 0, lte: 5 } } },
  sale: { label: "تخفیف‌دار", where: { compareAtPrice: { not: null } } },
  noimage: { label: "بدون عکس", where: { images: { none: {} } } },
} satisfies Record<string, { label: string; where: Prisma.ProductWhereInput }>;
export type ProductView = keyof typeof PRODUCT_VIEWS;

export const PRODUCT_SORTS = {
  newest: { label: "جدیدترین", orderBy: { createdAt: "desc" } },
  updated: { label: "آخرین ویرایش", orderBy: { updatedAt: "desc" } },
  name: { label: "نام (الف تا ی)", orderBy: { name: "asc" } },
  sku: { label: "کد کالا", orderBy: { sku: "asc" } },
  cheap: { label: "ارزان‌ترین", orderBy: { price: "asc" } },
  expensive: { label: "گران‌ترین", orderBy: { price: "desc" } },
  stock: { label: "کمترین موجودی", orderBy: { stock: "asc" } },
  sold: { label: "پرفروش‌ترین", orderBy: { soldCount: "desc" } },
} satisfies Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput }>;
export type ProductSort = keyof typeof PRODUCT_SORTS;
/** Default order never changes when a product is edited, so rows don't jump while working through the list. */
export const DEFAULT_PRODUCT_SORT: ProductSort = "newest";

export type ProductFilters = {
  q?: string;
  category?: string;
  brand?: string;
  view: ProductView;
  sort: ProductSort;
  page: number;
};

/** Query keys the list understands; also the only keys kept when returning from the edit page. */
export const PRODUCT_LIST_KEYS = ["q", "category", "brand", "view", "sort", "page"] as const;

/** Parses untrusted query params for the admin product list. */
export function parseProductFilters(sp: Record<string, string | string[] | undefined>): ProductFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const id = (k: string) => (idSchema.safeParse(one(k)).success ? one(k) : undefined);
  const view = one("view");
  const sort = one("sort");
  const page = Number(one("page"));
  return {
    q: one("q")?.trim().slice(0, 80) || undefined,
    category: id("category"),
    brand: id("brand"),
    view: view && view in PRODUCT_VIEWS ? (view as ProductView) : "all",
    sort: sort && sort in PRODUCT_SORTS ? (sort as ProductSort) : DEFAULT_PRODUCT_SORT,
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

const FA = "۰۱۲۳۴۵۶۷۸۹";
/** Spellings a word may be stored under: Arabic/Persian ی and ک, Persian/Latin digits. */
function spellings(word: string) {
  const latin = word.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)));
  const persian = latin.replace(/[0-9]/g, (d) => FA[Number(d)]);
  return [...new Set([word, latin, persian].flatMap((w) => [w, w.replace(/ی/g, "ي").replace(/ک/g, "ك")]))];
}

/** Where clause for everything except the tab (so each tab's count reflects the other filters). */
export function productWhere(f: ProductFilters, withView = true): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];
  if (withView) and.push(PRODUCT_VIEWS[f.view].where);
  // A main category also includes the products of its subcategories.
  if (f.category) and.push({ OR: [{ categoryId: f.category }, { category: { parentId: f.category } }] });
  if (f.brand) and.push({ brandId: f.brand });
  if (f.q) {
    // Every word must appear in the name, code, OEM code or brand ("لنت ۲۰۶ بوش").
    for (const word of f.q.split(/\s+/).filter(Boolean).slice(0, 6)) {
      and.push({
        OR: spellings(word).flatMap((w) => [
          { name: { contains: w, mode: "insensitive" as const } },
          { sku: { contains: w, mode: "insensitive" as const } },
          { oemCode: { contains: w, mode: "insensitive" as const } },
          { brand: { name: { contains: w, mode: "insensitive" as const } } },
        ]),
      });
    }
  }
  return { AND: and };
}

/** Stable order (id breaks ties) so paging never shows a product twice or skips one. */
export function productOrder(f: ProductFilters): Prisma.ProductOrderByWithRelationInput[] {
  return [PRODUCT_SORTS[f.sort].orderBy, { id: "asc" }];
}

/** The list's query string with only known keys, e.g. to come back to the same page after editing. */
export function productListQuery(sp: Record<string, string | string[] | undefined> | URLSearchParams) {
  const src = sp instanceof URLSearchParams ? sp : new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  const out = new URLSearchParams();
  for (const k of PRODUCT_LIST_KEYS) {
    const v = src.get(k);
    if (v) out.set(k, v.slice(0, 100));
  }
  return out.toString();
}
