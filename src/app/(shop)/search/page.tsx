import type { Metadata } from "next";
import { ProductListing } from "@/components/catalog/ProductListing";
import { SearchBox } from "@/components/layout/SearchBox";
import { parseFilters } from "@/lib/catalog";

export const metadata: Metadata = { title: "جستجو", robots: { index: false } };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const title = filters.q ? `نتایج جستجو برای «${filters.q}»` : "جستجو";
  // Phones hide the site header on inner pages, so the results page brings its own search box.
  const intro = (
    <>
      <h1 className="sr-only">{title}</h1>
      <div className="rounded-2xl bg-night p-3 md:hidden">
        <SearchBox />
      </div>
    </>
  );
  return <ProductListing title={title} basePath="/search" filters={filters} searchParams={sp} intro={intro} />;
}
