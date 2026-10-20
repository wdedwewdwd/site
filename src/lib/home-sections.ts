import "server-only";
import { db } from "./db";
import { productCardSelect, type ProductCardData } from "./catalog";
import { categoryCovers } from "./category-covers";

/**
 * Picks `limit` products from the given categories, one per subcategory in turn (price-list order inside each), so a
 * row shows the variety of parts instead of the first dozen of one kind. `skip` = picks to leave out per subcategory
 * (the home page's mixed selection starts at each subcategory's second product, so it does not repeat the rows).
 */
async function interleaved(categoryIds: string[], limit: number, skip = 0, seed?: number): Promise<ProductCardData[]> {
  const rows = await db.product.findMany({
    where: { isActive: true, categoryId: { in: categoryIds }, images: { some: {} } },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true, categoryId: true },
  });
  const groups = new Map<string, string[]>();
  for (const r of rows) groups.set(r.categoryId, [...(groups.get(r.categoryId) ?? []), r.id]);
  const lists = [...groups.values()];
  if (seed !== undefined) shuffle(lists, seed);
  const ids: string[] = [];
  for (let i = skip; ids.length < limit && lists.some((l) => l.length > i); i++) {
    for (const l of lists) {
      if (l[i]) ids.push(l[i]);
      if (ids.length >= limit) break;
    }
  }
  const cards = await db.product.findMany({ where: { id: { in: ids } }, select: productCardSelect });
  const byId = new Map(cards.map((c) => [c.id, c]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

export type CategoryRail = { slug: string; name: string; total: number; products: ProductCardData[] };

/** One row of products per main category (in the shop's category order), for the home page. */
export async function getCategoryRails(limit = 12): Promise<CategoryRail[]> {
  const mains = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, slug: true, name: true, children: { where: { isActive: true }, select: { id: true } } },
  });
  const rails = await Promise.all(
    mains.map(async (m) => {
      const ids = [m.id, ...m.children.map((c) => c.id)];
      const [products, total] = await Promise.all([
        interleaved(ids, limit),
        db.product.count({ where: { isActive: true, categoryId: { in: ids } } }),
      ]);
      return { slug: m.slug, name: m.name, total, products };
    }),
  );
  return rails.filter((r) => r.products.length > 0);
}

/** Same order for everyone on a given day (Fisher–Yates with a small seeded generator). */
function shuffle<T>(items: T[], seed: number) {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/**
 * A mix from the whole catalogue for when nothing has sold yet: each subcategory's second product onwards, kinds of
 * part in a different order every day, so it neither repeats the category rows nor looks the same each visit.
 */
export async function getMixedPicks(limit = 8) {
  const all = await db.category.findMany({ where: { isActive: true }, select: { id: true } });
  const day = Math.floor((Date.now() + 3.5 * 3600_000) / 86_400_000); // Tehran calendar day
  return interleaved(
    all.map((c) => c.id),
    limit,
    1,
    day,
  );
}

export type PopularSubcategory = { slug: string; name: string; icon: string | null; image: string | null; count: number };

/** Subcategories with the most products, each with its cover photo (for the round «by kind of part» shortcuts). */
export async function getPopularSubcategories(limit = 12): Promise<PopularSubcategory[]> {
  const subs = await db.category.findMany({
    where: { isActive: true, parentId: { not: null }, parent: { isActive: true } },
    select: { id: true, slug: true, name: true, icon: true, image: true, _count: { select: { products: { where: { isActive: true } } } } },
  });
  const top = subs
    .filter((s) => s._count.products > 0)
    .sort((a, b) => b._count.products - a._count.products)
    .slice(0, limit);
  const covers = await categoryCovers(top);
  return top.map((s) => ({ slug: s.slug, name: s.name, icon: s.icon, image: covers.get(s.id) ?? null, count: s._count.products }));
}
