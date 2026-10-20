import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PackageSearch, X } from "lucide-react";
import { db } from "@/lib/db";
import { activeSort, listProducts, PAGE_SIZE, SORTS, type ProductFilters, type SortKey } from "@/lib/catalog";
import { faDigits } from "@/lib/format";
import { MAKERS } from "@/lib/makers";
import { ProductCard } from "@/components/product/ProductCard";
import { FilterPanel } from "./FilterPanel";
import { PageBar } from "@/components/layout/PageBar";
import { OpenChatButton } from "@/components/chat/OpenChatButton";

type Props = {
  title: string;
  basePath: string;
  filters: ProductFilters;
  searchParams: Record<string, string | string[] | undefined>;
  crumbs?: { href?: string; label: string }[];
  /** Optional block shown above the results (e.g. category description and subcategories). */
  intro?: React.ReactNode;
  /** Parent page for the back button. */
  backHref?: string;
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

export async function ProductListing({ title, basePath, filters, searchParams, crumbs = [], intro, backHref }: Props) {
  const [{ items, total, page, pages, partial }, brands, cars] = await Promise.all([
    listProducts(filters),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true, latin: true } }),
    db.carModel.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
  ]);
  const sort = activeSort(filters);
  const sorts = (Object.keys(SORTS) as SortKey[]).filter((k) => k !== "relevance" || filters.q);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="container-page flex flex-col gap-6 py-6 md:py-8">
      <PageBar title={title} backHref={backHref ?? crumbs.at(-1)?.href ?? "/"} crumbs={crumbs} />
      {intro ?? <h1 className="sr-only">{title}</h1>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,1fr)_210px] lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="order-2 flex flex-col gap-5 md:order-1">
          {/* Sort bar */}
          <div className="card flex flex-col gap-2.5 px-4 py-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3 md:px-5 md:py-3.5">
            {/* Phones: one row of chips that scrolls sideways; desktop: plain links. */}
            <nav aria-label="مرتب‌سازی" className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 text-[13px] md:mx-0 md:flex-wrap md:gap-4 md:overflow-visible md:px-0">
              <span className="shrink-0 font-extrabold">
                مرتب‌سازی<span className="hidden md:inline"> بر اساس</span>:
              </span>
              {sorts.map((k) => (
                <Link
                  key={k}
                  href={hrefWith(basePath, searchParams, { sort: k, page: null })}
                  aria-current={sort === k ? "true" : undefined}
                  className={`shrink-0 rounded-full px-3 py-1.5 md:rounded-none md:bg-transparent md:p-0 ${
                    sort === k ? "bg-brand-soft font-extrabold text-brand" : "bg-surface text-muted hover:text-ink"
                  }`}
                  scroll={false}
                >
                  {SORTS[k].label}
                </Link>
              ))}
            </nav>
            <p className="text-xs text-muted md:text-[13px]">
              نمایش {faDigits(from)} - {faDigits(to)} از {faDigits(total)} قطعه
            </p>
          </div>

          {filters.maker && (
            <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-white px-4 py-3 text-[13px]">
              <span className="grid size-9 place-items-center rounded-xl" style={{ background: MAKERS[filters.maker].soft }}>
                <Image src={MAKERS[filters.maker].logo} alt="" width={24} height={24} unoptimized={MAKERS[filters.maker].logo.endsWith(".svg")} className="size-6 object-contain" />
              </span>
              <span className="flex-1 font-bold">
                قطعات مناسب خودروهای {MAKERS[filters.maker].name}
                <span className="block text-[11px] font-normal text-muted">به‌همراه قطعات عمومی (مثل روغن و لامپ) که مخصوص خودروی خاصی نیستند.</span>
              </span>
              <Link href={hrefWith(basePath, searchParams, { maker: null, page: null })} scroll={false} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-brand hover:bg-brand-soft">
                <X className="size-3.5" aria-hidden /> همه خودروها
              </Link>
            </div>
          )}

          {partial && items.length > 0 && (
            <p className="rounded-xl bg-warning-soft px-4 py-3 text-[13px] font-bold text-warning">
              کالایی دقیقاً با «{filters.q}» پیدا نشد؛ نزدیک‌ترین نتایج را می‌بینید.
            </p>
          )}

          {items.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
              <PackageSearch className="size-12 text-subtle" />
              <p className="font-extrabold">محصولی با این مشخصات پیدا نشد.</p>
              <p className="text-sm text-muted">
                {filters.q ? "کلمه کوتاه‌تر، نام خودرو یا کد فنی قطعه را امتحان کنید؛ یا از پشتیبانی بپرسید تا قطعه را برایتان پیدا کنیم." : "فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید."}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {filters.q && <OpenChatButton className="btn-primary" label="پرسیدن از پشتیبانی" />}
                <Link href={basePath} className="btn-ghost">حذف همه فیلترها</Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {pages > 1 && <Pagination page={page} pages={pages} href={(n) => hrefWith(basePath, searchParams, { page: String(n) })} />}
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

/** Page numbers around the current page, the first and last page, «…» for the gaps, and previous/next arrows. */
function Pagination({ page, pages, href }: { page: number; pages: number; href: (n: number) => string }) {
  const shown = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  const cell = "grid size-10 shrink-0 place-items-center rounded-lg text-sm font-bold";
  const arrow = (to: number, label: string, Icon: typeof ChevronLeft) =>
    to < 1 || to > pages ? (
      <span className={`${cell} border border-line bg-white text-subtle`} aria-hidden>
        <Icon className="size-4" />
      </span>
    ) : (
      <Link href={href(to)} aria-label={label} className={`${cell} border border-line bg-white hover:bg-canvas`}>
        <Icon className="size-4" />
      </Link>
    );
  return (
    <nav aria-label="صفحه‌بندی" className="flex items-center justify-center gap-1.5 sm:gap-2">
      {arrow(page - 1, "صفحه قبل", ChevronRight)}
      {shown.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && n - shown[i - 1] > 1 && <span className="px-0.5 text-sm text-muted" aria-hidden>…</span>}
          <Link
            href={href(n)}
            aria-current={n === page ? "page" : undefined}
            className={`${cell} ${n === page ? "bg-brand text-white" : "border border-line bg-white hover:bg-canvas"}`}
          >
            {faDigits(n)}
          </Link>
        </span>
      ))}
      {arrow(page + 1, "صفحه بعد", ChevronLeft)}
    </nav>
  );
}
