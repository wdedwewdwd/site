import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { db } from "@/lib/db";
import { listProducts, PAGE_SIZE, SORTS, type ProductFilters, type SortKey } from "@/lib/catalog";
import { faDigits } from "@/lib/format";
import { ProductCard } from "@/components/product/ProductCard";
import { FilterPanel } from "./FilterPanel";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type Props = {
  title: string;
  basePath: string;
  filters: ProductFilters;
  searchParams: Record<string, string | string[] | undefined>;
  crumbs?: { href?: string; label: string }[];
};

function hrefWith(basePath: string, sp: Props["searchParams"], patch: Record<string, string | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") p.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) p.delete(k);
    else p.set(k, v);
  }
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export async function ProductListing({ title, basePath, filters, searchParams, crumbs = [] }: Props) {
  const [{ items, total, page, pages }, brands, cars] = await Promise.all([
    listProducts(filters),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true, latin: true } }),
    db.carModel.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
  ]);
  const sort: SortKey = filters.sort ?? "newest";
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="container-page flex flex-col gap-6 py-6 md:py-8">
      <Breadcrumbs items={[...crumbs, { label: title }]} />
      <h1 className="sr-only">{title}</h1>

      <div className="grid gap-6 md:grid-cols-[1fr_210px] lg:grid-cols-[1fr_260px]">
        <div className="order-2 flex flex-col gap-5 md:order-1">
          {/* Sort bar */}
          <div className="card flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <nav aria-label="مرتب‌سازی" className="flex flex-wrap items-center gap-4 text-[13px]">
              <span className="font-extrabold">مرتب‌سازی بر اساس:</span>
              {(Object.keys(SORTS) as SortKey[]).map((k) => (
                <Link
                  key={k}
                  href={hrefWith(basePath, searchParams, { sort: k, page: null })}
                  aria-current={sort === k ? "true" : undefined}
                  className={sort === k ? "font-extrabold text-brand" : "text-muted hover:text-ink"}
                  scroll={false}
                >
                  {SORTS[k].label}
                </Link>
              ))}
            </nav>
            <p className="text-[13px] text-muted">
              نمایش {faDigits(from)} - {faDigits(to)} از {faDigits(total)} قطعه
            </p>
          </div>

          {items.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
              <PackageSearch className="size-12 text-subtle" />
              <p className="font-extrabold">محصولی با این مشخصات پیدا نشد.</p>
              <p className="text-sm text-muted">فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید.</p>
              <Link href={basePath} className="btn-ghost mt-2">حذف همه فیلترها</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav aria-label="صفحه‌بندی" className="flex items-center justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2)
                .map((n) => (
                  <Link
                    key={n}
                    href={hrefWith(basePath, searchParams, { page: String(n) })}
                    aria-current={n === page ? "page" : undefined}
                    className={`grid size-10 place-items-center rounded-lg text-sm font-bold ${
                      n === page ? "bg-brand text-white" : "border border-line bg-white hover:bg-canvas"
                    }`}
                  >
                    {faDigits(n)}
                  </Link>
                ))}
            </nav>
          )}
        </div>

        <div className="order-1 md:order-2">
          <FilterPanel
            brands={brands.map((b) => ({ slug: b.slug, label: b.latin ? `${b.name} (${b.latin})` : b.name }))}
            cars={cars.map((c) => ({ slug: c.slug, label: c.name }))}
          />
        </div>
      </div>
    </div>
  );
}
