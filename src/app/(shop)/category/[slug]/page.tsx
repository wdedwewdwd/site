import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { ProductListing } from "@/components/catalog/ProductListing";
import { categoryCovers } from "@/lib/category-covers";
import { CategoryCover } from "@/components/ui/CategoryCover";
import { parseFilters } from "@/lib/catalog";

const getCategory = cache((slug: string) =>
  /^[a-z0-9-]{1,64}$/.test(slug)
    ? db.category.findFirst({
        where: { slug, isActive: true },
        include: {
          parent: { select: { name: true, slug: true, isActive: true } },
          children: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true, icon: true, image: true } },
        },
      })
    : null,
);

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  if (!category) return { title: "دسته‌بندی" };
  return { title: category.name, description: category.description?.slice(0, 160) };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/category/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategory(slug);
  if (!category) notFound();
  const filters = { ...parseFilters(sp), category: slug };
  // Subcategory links keep the carmaker chosen on the home page.
  const keep = filters.maker ? `?maker=${filters.maker}` : "";
  const covers = await categoryCovers(category.children);

  const crumbs = [
    { href: "/categories", label: "دسته‌بندی‌ها" },
    ...(category.parent?.isActive ? [{ href: `/category/${category.parent.slug}`, label: category.parent.name }] : []),
  ];

  return (
    <ProductListing
      title={category.name}
      basePath={`/category/${slug}`}
      filters={filters}
      searchParams={sp}
      crumbs={crumbs}
      backHref={category.parent?.isActive ? `/category/${category.parent.slug}` : "/categories"}
      intro={
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-black md:text-2xl">{category.name}</h1>
            {category.description && <p className="max-w-3xl text-sm leading-7 text-muted">{category.description}</p>}
          </div>
          {category.children.length > 0 && (
            <nav aria-label="زیردسته‌ها">
              {/* Phones: one row that scrolls sideways, so the products are not pushed below the fold. */}
              <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
                {category.children.map((c) => (
                  <li key={c.slug} className="shrink-0">
                    <Link href={`/category/${c.slug}${keep}`} className="flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-white py-1 ps-1 pe-4 text-xs font-bold transition-colors hover:border-brand hover:text-brand">
                      <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-surface">
                        <CategoryCover image={covers.get(c.id)} icon={c.icon} sizes="32px" iconClassName="size-4" />
                      </span>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </header>
      }
    />
  );
}
