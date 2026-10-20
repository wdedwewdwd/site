import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { faDigits } from "@/lib/format";
import { categoryCovers } from "@/lib/category-covers";
import { CategoryCover } from "@/components/ui/CategoryCover";
import { PageBar } from "@/components/layout/PageBar";

export const metadata: Metadata = { title: "دسته‌بندی قطعات" };

/** Subcategory links shown on a card; the rest are one click away on the category page. */
const MAX_CHIPS = 6;

export default async function CategoriesPage() {
  const [categories, perCategory] = await Promise.all([
    db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      include: { children: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true, isActive: true } } },
    }),
    db.product.groupBy({ by: ["categoryId"], where: { isActive: true }, _count: { _all: true } }),
  ]);
  // Same rule as the category page listing: its own products plus those of its subcategories.
  const counts = new Map(perCategory.map((g) => [g.categoryId, g._count._all]));
  const productCount = (c: (typeof categories)[number]) =>
    (counts.get(c.id) ?? 0) + c.children.reduce((sum, k) => sum + (counts.get(k.id) ?? 0), 0);
  const covers = await categoryCovers(categories);

  return (
    <div className="container-page flex flex-col gap-6 py-6 md:py-8">
      <PageBar title="دسته‌بندی‌ها" backHref="/" />
      <h1 className="sr-only text-xl font-black md:not-sr-only">دسته‌بندی قطعات</h1>
      <ul className="grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
        {categories.map((c) => {
          const children = c.children.filter((k) => k.isActive);
          const more = children.length - MAX_CHIPS;
          return (
            <li key={c.id} className="card group flex flex-col overflow-hidden transition-colors hover:border-brand">
              <Link href={`/category/${c.slug}`} className="flex flex-col">
                <span className="relative aspect-[16/10] overflow-hidden bg-surface sm:aspect-[4/3]">
                  <CategoryCover
                    image={covers.get(c.id)}
                    icon={c.icon}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    iconClassName="size-12"
                    className="transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                </span>
                <span className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <span className="text-base font-extrabold group-hover:text-brand">{c.name}</span>
                  <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-muted">{faDigits(productCount(c))} محصول</span>
                </span>
              </Link>
              {children.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 border-t border-line px-4 py-3 sm:px-5">
                  {children.slice(0, MAX_CHIPS).map((k) => (
                    <li key={k.slug} className="min-w-0 max-w-full">
                      <Link
                        href={`/category/${k.slug}`}
                        className="block truncate rounded-full bg-surface px-3 py-1 text-[11px] font-bold text-muted hover:bg-brand-soft hover:text-brand"
                      >
                        {k.name}
                      </Link>
                    </li>
                  ))}
                  {more > 0 && (
                    <li>
                      <Link
                        href={`/category/${c.slug}`}
                        className="block rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold text-brand hover:bg-brand hover:text-white"
                      >
                        {faDigits(more)} مورد دیگر
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
