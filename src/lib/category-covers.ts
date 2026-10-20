import "server-only";
import { db } from "./db";

type CoverInput = { id: string; image: string | null };

/**
 * Cover photo of each category: its own photo (uploaded in the admin or built in), otherwise the photo of its first
 * product in price-list order (a main category also looks in its subcategories). Missing = no photo; show the icon.
 */
export async function categoryCovers(categories: CoverInput[]): Promise<Map<string, string>> {
  const covers = new Map<string, string>();
  for (const c of categories) if (c.image) covers.set(c.id, c.image);
  const need = new Set(categories.filter((c) => !c.image).map((c) => c.id));
  if (need.size === 0) return covers;

  const subs = await db.category.findMany({ where: { parentId: { in: [...need] }, isActive: true }, select: { id: true, parentId: true } });
  const parentOf = new Map(subs.map((s) => [s.id, s.parentId as string]));
  const rows = await db.product.findMany({
    where: { isActive: true, categoryId: { in: [...need, ...parentOf.keys()] }, images: { some: {} } },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { categoryId: true, images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  for (const r of rows) {
    const url = r.images[0]?.url;
    if (!url) continue;
    for (const id of [r.categoryId, parentOf.get(r.categoryId)]) {
      if (id && need.has(id) && !covers.has(id)) covers.set(id, url);
    }
  }
  return covers;
}
