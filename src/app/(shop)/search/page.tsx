import type { Metadata } from "next";
import { ProductListing } from "@/components/catalog/ProductListing";
import { parseFilters } from "@/lib/catalog";

export const metadata: Metadata = { title: "جستجو", robots: { index: false } };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const title = filters.q ? `نتایج جستجو برای «${filters.q}»` : "جستجو";
  return <ProductListing title={title} basePath="/search" filters={filters} searchParams={sp} />;
}
