import "server-only";
import { db } from "./db";
import { searchProducts } from "./search-index";
import type { Prisma } from "@/generated/prisma/client";

export const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  ratingAvg: true,
  ratingCount: true,
  brand: { select: { name: true, latin: true } },
  images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
  fitments: { select: { carModel: { select: { make: true, name: true } } }, take: 3 },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export const SORTS = {
  // Only offered on search results; ranks by how well each product matches the query.
  relevance: { label: "مرتبط‌ترین", orderBy: { soldCount: "desc" } },
  newest: { label: "جدیدترین", orderBy: { createdAt: "desc" } },
  bestselling: { label: "پرفروش‌ترین‌ها", orderBy: { soldCount: "desc" } },
  cheapest: { label: "ارزان‌ترین", orderBy: { price: "asc" } },
  expensive: { label: "گران‌ترین", orderBy: { price: "desc" } },
} satisfies Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput }>;
export type SortKey = keyof typeof SORTS;

export const PAGE_SIZE = 12;

export type ProductFilters = {
  q?: string;
  category?: string; // slug
  brands?: string[]; // slugs
  cars?: string[]; // slugs
  inStock?: boolean;
  offers?: boolean;
  sort?: SortKey;
  page?: number;
};

/** The sort in effect: search results default to relevance, other listings to newest. */
export const activeSort = (f: ProductFilters): SortKey => (f.sort === "relevance" && !f.q ? "newest" : (f.sort ?? (f.q ? "relevance" : "newest")));

/** Filters other than the search text (that goes through `searchProducts`). */
export function buildProductWhere(f: ProductFilters): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ isActive: true }];
  if (f.category) and.push({ category: { OR: [{ slug: f.category }, { parent: { slug: f.category } }] } });
  if (f.brands?.length) and.push({ brand: { slug: { in: f.brands } } });
  if (f.cars?.length) and.push({ fitments: { some: { carModel: { slug: { in: f.cars } } } } });
  if (f.inStock) and.push({ stock: { gt: 0 } });
  if (f.offers) and.push({ compareAtPrice: { not: null } });
  return { AND: and };
}

export async function listProducts(f: ProductFilters) {
  const page = Math.max(1, Math.min(f.page ?? 1, 500));
  const sort = activeSort(f);
  let where = buildProductWhere(f);
  let partial = false;

  if (f.q?.trim()) {
    const result = await searchProducts(f.q);
    partial = result.partial;
    where = { AND: [where, { id: { in: result.hits.map((h) => h.id) } }] };
    if (sort === "relevance") {
      // Keep the search engine's order; the other filters (brand, car, stock…) only remove products.
      const allowed = new Set((await db.product.findMany({ where, select: { id: true } })).map((p) => p.id));
      const ordered = result.hits.filter((h) => allowed.has(h.id)).map((h) => h.id);
      const pageIds = ordered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      const rows = await db.product.findMany({ where: { id: { in: pageIds } }, select: productCardSelect });
      const byId = new Map(rows.map((r) => [r.id, r]));
      const items = pageIds.flatMap((id) => byId.get(id) ?? []);
      return { items, total: ordered.length, page, pages: Math.max(1, Math.ceil(ordered.length / PAGE_SIZE)), partial };
    }
  }

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      select: productCardSelect,
      orderBy: [SORTS[sort].orderBy, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), partial };
}

/** Parses untrusted query-string params into safe filters. */
export function parseFilters(sp: Record<string, string | string[] | undefined>): ProductFilters {
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.slice(0, 100);
  };
  const many = (k: string) => {
    const v = sp[k];
    const arr = Array.isArray(v) ? v : v ? v.split(",") : [];
    return arr.map((s) => s.slice(0, 64)).filter((s) => /^[a-z0-9-]+$/.test(s)).slice(0, 20);
  };
  const sort = one("sort");
  const page = Number(one("page"));
  return {
    q: one("q") || undefined,
    brands: many("brand"),
    cars: many("car"),
    inStock: one("stock") === "1",
    offers: one("offers") === "1",
    sort: sort && sort in SORTS ? (sort as SortKey) : undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Categories as select options: each main category followed by its subcategories (indented). */
export async function categoryOptions() {
  const all = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, parentId: true },
  });
  return all
    .filter((c) => !c.parentId)
    .flatMap((main) => [
      { id: main.id, name: main.name },
      ...all.filter((c) => c.parentId === main.id).map((c) => ({ id: c.id, name: `   ↳ ${c.name}` })),
    ]);
}

/** Shared car list for the product form, with how many products each car is ticked on. */
export async function carRows() {
  const cars = await db.carModel.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, make: true, name: true, _count: { select: { fitments: true } } },
  });
  return cars.map(({ _count, ...c }) => ({ ...c, products: _count.fitments }));
}
