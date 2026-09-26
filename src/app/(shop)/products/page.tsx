import type { Metadata } from "next";
import { ProductListing } from "@/components/catalog/ProductListing";
import { parseFilters } from "@/lib/catalog";

export const metadata: Metadata = { title: "همه محصولات" };

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const sp = await searchParams;
  return <ProductListing title="همه محصولات" basePath="/products" filters={parseFilters(sp)} searchParams={sp} />;
}
