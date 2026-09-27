import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { faDigits } from "@/lib/format";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { PageBar } from "@/components/layout/PageBar";

export const metadata: Metadata = { title: "دسته‌بندی قطعات" };

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
      children: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { name: true, slug: true } },
    },
  });
  return (
    <div className="container-page flex flex-col gap-6 py-6 md:py-8">
      <PageBar title="دسته‌بندی‌ها" backHref="/" />
      <h1 className="sr-only text-xl font-black md:not-sr-only">دسته‌بندی قطعات</h1>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={`/category/${c.slug}`}
              className="card flex h-full flex-col items-center gap-3 p-6 text-center transition-colors hover:border-brand"
            >
              <span className="grid size-16 place-items-center rounded-full bg-brand-soft text-brand">
                <CategoryIcon name={c.icon} className="size-7" />
              </span>
              <span className="text-sm font-extrabold">{c.name}</span>
              <span className="text-xs text-muted">{faDigits(c._count.products)} محصول</span>
            </Link>
            {c.children.length > 0 && (
              <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
                {c.children.map((k) => (
                  <li key={k.slug}>
                    <Link href={`/category/${k.slug}`} className="block rounded-full bg-surface px-3 py-1 text-[11px] font-bold text-muted hover:bg-brand-soft hover:text-brand">
                      {k.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
