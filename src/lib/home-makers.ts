import "server-only";
import { db } from "./db";
import { makerWhere } from "./catalog";
import { carMaker, MAKER_KEYS, MAKERS, type MakerKey } from "./makers";

export type MakerSection = {
  key: MakerKey;
  name: string;
  latin: string;
  logo: string;
  color: string;
  soft: string;
  hint: string;
  total: number;
  cars: { slug: string; name: string }[];
  categories: { slug: string; name: string; icon: string | null; count: number }[];
};

/** For each maker: its cars and the main categories that have parts for them (subcategories counted in). */
export async function getMakerSections(): Promise<MakerSection[]> {
  const [cars, categories] = await Promise.all([
    db.carModel.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, make: true, name: true, slug: true } }),
    db.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, slug: true, name: true, icon: true, parentId: true } }),
  ]);
  const topOf = new Map(categories.map((c) => [c.id, c.parentId ?? c.id]));
  const mains = categories.filter((c) => !c.parentId);

  return Promise.all(
    MAKER_KEYS.map(async (key) => {
      const { name, latin, logo, color, soft, hint } = MAKERS[key];
      const own = cars.filter((c) => carMaker(c.make, c.name) === key);
      const groups = await db.product.groupBy({
        by: ["categoryId"],
        where: { isActive: true, ...makerWhere(own.map((c) => c.id)) },
        _count: true,
      });
      const counts = new Map<string, number>();
      for (const g of groups) {
        const top = topOf.get(g.categoryId);
        if (top) counts.set(top, (counts.get(top) ?? 0) + g._count);
      }
      const list = mains.flatMap((c) => (counts.get(c.id) ? [{ slug: c.slug, name: c.name, icon: c.icon, count: counts.get(c.id)! }] : []));
      return {
        key,
        name,
        latin,
        logo,
        color,
        soft,
        hint,
        total: list.reduce((n, c) => n + c.count, 0),
        cars: own.slice(0, 10).map((c) => ({ slug: c.slug, name: c.name })),
        categories: list,
      };
    }),
  );
}
