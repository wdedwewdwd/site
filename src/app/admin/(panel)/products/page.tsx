import Link from "next/link";
import { ChevronLeft, ChevronRight, PackageSearch, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { faDigits } from "@/lib/format";
import { categoryOptions } from "@/lib/catalog";
import {
  DEFAULT_PRODUCT_SORT,
  PRODUCT_SORTS,
  PRODUCT_VIEWS,
  PRODUCTS_PAGE_SIZE,
  parseProductFilters,
  productListQuery,
  productOrder,
  productWhere,
  type ProductView,
} from "@/lib/admin-products";
import { idSchema } from "@/lib/validation";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { ProductsToolbar } from "@/components/admin/products/ProductsToolbar";
import { ProductList, type ProductRow } from "@/components/admin/products/ProductList";

export const metadata = { title: "محصولات" };

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireStaff(["ADMIN"]);
  const sp = await searchParams;
  const f = parseProductFilters(sp);
  const where = productWhere(f);
  const others = productWhere(f, false);
  const views = Object.keys(PRODUCT_VIEWS) as ProductView[];

  const [products, total, viewCounts, categories, brands] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: productOrder(f),
      skip: (f.page - 1) * PRODUCTS_PAGE_SIZE,
      take: PRODUCTS_PAGE_SIZE,
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }),
    db.product.count({ where }),
    Promise.all(views.map((v) => db.product.count({ where: { AND: [others, PRODUCT_VIEWS[v].where] } }))),
    categoryOptions(),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE));
  const back = productListQuery(sp);
  const savedId = typeof sp.saved === "string" && idSchema.safeParse(sp.saved).success ? sp.saved : undefined;
  const filtered = !!(f.q || f.category || f.brand || f.sort !== DEFAULT_PRODUCT_SORT);

  const qs = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(back);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return s ? `/admin/products?${s}` : "/admin/products";
  };

  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    oemCode: p.oemCode,
    brand: p.brand?.name ?? null,
    category: p.category.name,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    stock: p.stock,
    isActive: p.isActive,
    soldCount: p.soldCount,
    image: p.images[0]?.url ?? null,
  }));
  const first = (f.page - 1) * PRODUCTS_PAGE_SIZE + 1;
  const last = Math.min(f.page * PRODUCTS_PAGE_SIZE, total);

  return (
    <>
      <PageHeader title="محصولات">
        <Link href="/admin/products/new" className="btn-primary py-2.5"><Plus className="size-4" /> افزودن محصول</Link>
      </PageHeader>
      <HelpBox
        items={[
          "همه محصولات اینجا هستند، صفحه به صفحه (هر صفحه ۵۰ محصول). پایین جدول با دکمه‌های شماره‌دار به صفحه‌های بعد بروید.",
          "تب‌های بالا (فعال، ناموجود، رو به اتمام، بدون عکس و…) محصولات را دسته‌بندی می‌کنند؛ عدد کنار هر تب تعداد آن‌هاست.",
          "با کادر جستجو بر اساس نام، کد کالا، کد فنی (OEM) یا برند پیدا کنید؛ چند کلمه هم می‌شود («لنت ۲۰۶ بوش»). دسته، برند و ترتیب نمایش را هم می‌توانید انتخاب کنید.",
          "برای تغییر سریع قیمت یا موجودی، روی عدد آن در جدول بزنید، عدد جدید را بنویسید و Enter بزنید. برای بقیه اطلاعات (عکس، توضیحات، تخفیف، خودروها) روی نام محصول یا آیکون مداد بزنید؛ بعد از ذخیره به همین صفحه و همین فیلترها برمی‌گردید.",
          "برای کار گروهی، محصولات را تیک بزنید؛ نواری پایین صفحه باز می‌شود برای فعال یا غیرفعال کردن، تغییر دسته یا حذف همه آن‌ها با هم.",
          "«غیرفعال» محصول را بدون حذف از فروشگاه پنهان می‌کند. «حذف» برای همیشه است؛ سفارش‌های قبلی با نام و قیمت کالا سر جایشان می‌مانند.",
        ]}
      />

      <ProductsToolbar
        q={f.q ?? ""}
        category={f.category ?? ""}
        brand={f.brand ?? ""}
        sort={f.sort}
        defaultSort={DEFAULT_PRODUCT_SORT}
        categories={categories}
        brands={brands}
        sorts={Object.entries(PRODUCT_SORTS).map(([key, s]) => ({ key, label: s.label }))}
        filtered={filtered}
      />

      <nav className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="نوع محصولات">
        {views.map((v, i) => {
          const active = f.view === v;
          return (
            <Link
              key={v}
              href={qs({ view: v === "all" ? null : v, page: null })}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${active ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink"}`}
            >
              {PRODUCT_VIEWS[v].label}
              <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/20" : "bg-surface"}`}>{faDigits(viewCounts[i])}</span>
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <PackageSearch className="size-10 text-subtle" aria-hidden />
          <p className="font-bold">محصولی با این فیلترها پیدا نشد.</p>
          {(filtered || f.view !== "all") && <Link href="/admin/products" className="text-sm font-bold text-brand hover:underline">نمایش همه محصولات</Link>}
        </div>
      ) : (
        <ProductList key={`${back}`} rows={rows} categories={categories} back={back} savedId={savedId} />
      )}

      {total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <span>
            نمایش {faDigits(first)} تا {faDigits(last)} از <b className="text-ink">{faDigits(total)}</b> محصول
          </span>
          {pages > 1 && (
            <nav className="flex items-center gap-1" aria-label="صفحه‌بندی">
              <PageLink href={f.page > 1 ? qs({ page: f.page - 1 === 1 ? null : String(f.page - 1) }) : null} label="صفحه قبل">
                <ChevronRight className="size-4" />
              </PageLink>
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === pages || Math.abs(n - f.page) <= 2)
                .map((n, i, arr) => (
                  <span key={n} className="flex items-center gap-1">
                    {i > 0 && n - arr[i - 1] > 1 && <span className="px-1">…</span>}
                    <Link
                      href={qs({ page: n === 1 ? null : String(n) })}
                      aria-current={n === f.page ? "page" : undefined}
                      className={`grid size-9 place-items-center rounded-lg font-bold ${n === f.page ? "bg-ink text-white" : "bg-white ring-1 ring-line hover:bg-canvas"}`}
                    >
                      {faDigits(n)}
                    </Link>
                  </span>
                ))}
              <PageLink href={f.page < pages ? qs({ page: String(f.page + 1) }) : null} label="صفحه بعد">
                <ChevronLeft className="size-4" />
              </PageLink>
            </nav>
          )}
        </div>
      )}
    </>
  );
}

function PageLink({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  const cls = "grid size-9 place-items-center rounded-lg bg-white ring-1 ring-line";
  if (!href) return <span className={`${cls} opacity-40`} aria-hidden>{children}</span>;
  return <Link href={href} aria-label={label} className={`${cls} hover:bg-canvas`}>{children}</Link>;
}
