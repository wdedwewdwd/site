import type { Metadata } from "next";
import { ProductListing } from "@/components/catalog/ProductListing";
import { parseFilters } from "@/lib/catalog";

export const metadata: Metadata = { title: "تخفیف‌ها و پیشنهادها" };

export default async function OffersPage({ searchParams }: PageProps<"/offers">) {
  const sp = await searchParams;
  return (
    <ProductListing title="تخفیف‌ها و پیشنهادها" basePath="/offers" filters={{ ...parseFilters(sp), offers: true }} searchParams={sp} />
  );
}
