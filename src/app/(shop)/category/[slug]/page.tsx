import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { ProductListing } from "@/components/catalog/ProductListing";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { parseFilters } from "@/lib/catalog";

const getCategory = cache((slug: string) =>
  /^[a-z0-9-]{1,64}$/.test(slug)
    ? db.category.findFirst({
        where: { slug, isActive: true },
        include: {
          parent: { select: { name: true, slug: true, isActive: true } },
          children: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { name: true, slug: true, icon: true } },
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

  const crumbs = [
    { href: "/categories", label: "دسته‌بندی‌ها" },
    ...(category.parent?.isActive ? [{ href: `/category/${category.parent.slug}`, label: category.parent.name }] : []),
  ];

  return (
    <ProductListing
      title={category.name}
      basePath={`/category/${slug}`}
      filters={{ ...parseFilters(sp), category: slug }}
      searchParams={sp}
      crumbs={crumbs}
      intro={
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-black md:text-2xl">{category.name}</h1>
            {category.description && <p className="max-w-3xl text-sm leading-7 text-muted">{category.description}</p>}
          </div>
          {category.children.length > 0 && (
            <nav aria-label="زیردسته‌ها">
              <ul className="flex flex-wrap gap-2">
                {category.children.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/category/${c.slug}`} className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-xs font-bold transition-colors hover:border-brand hover:text-brand">
                      <CategoryIcon name={c.icon} className="size-4" />
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
