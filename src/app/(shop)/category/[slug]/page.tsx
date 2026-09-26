import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { ProductListing } from "@/components/catalog/ProductListing";
import { parseFilters } from "@/lib/catalog";

const getCategory = cache((slug: string) =>
  /^[a-z0-9-]{1,64}$/.test(slug) ? db.category.findFirst({ where: { slug, isActive: true } }) : null,
);

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  return { title: category?.name ?? "دسته‌بندی" };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/category/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategory(slug);
  if (!category) notFound();
  return (
    <ProductListing
      title={category.name}
      basePath={`/category/${slug}`}
      filters={{ ...parseFilters(sp), category: slug }}
      searchParams={sp}
      crumbs={[{ href: "/categories", label: "دسته‌بندی‌ها" }]}
    />
  );
}
