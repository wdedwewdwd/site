import Link from "next/link";
import { db } from "@/lib/db";
import { productCardSelect } from "@/lib/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { HeroBanners } from "@/components/home/HeroBanners";
import { getHomeBanners } from "@/lib/banners";

export default async function HomePage() {
  const [hero, categories, bestSellers, offers] = await Promise.all([
    getHomeBanners(),
    db.category.findMany({ where: { isActive: true, parentId: null }, orderBy: { sortOrder: "asc" }, take: 8 }),
    db.product.findMany({ where: { isActive: true }, orderBy: { soldCount: "desc" }, take: 4, select: productCardSelect }),
    db.product.findMany({
      where: { isActive: true, compareAtPrice: { not: null }, stock: { gt: 0 } },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: productCardSelect,
    }),
  ]);

  return (
    <div className="container-page flex flex-col gap-8 py-4 md:gap-10 md:py-8">
      <h1 className="sr-only">آریزون یدک | فروشگاه آنلاین قطعات یدکی خودرو</h1>
      <HeroBanners layout={hero.layout} banners={hero.banners} autoplay={hero.autoplay} />

      {/* Categories */}
      <section className="flex flex-col gap-4" aria-labelledby="cat-title">
        <div className="flex items-center justify-between">
          <h2 id="cat-title" className="text-base font-black md:text-lg">دسته‌بندی موضوعی قطعات</h2>
          <Link href="/categories" className="text-[13px] font-bold text-brand md:hidden">مشاهده همه</Link>
        </div>
        {/* Mobile: round icon rail */}
        <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 md:hidden">
          {categories.map((c) => (
            <li key={c.id} className="shrink-0">
              <Link href={`/category/${c.slug}`} className="flex w-[68px] flex-col items-center gap-2 text-center text-xs font-bold">
                <span className="grid size-[60px] place-items-center rounded-full border border-line bg-white">
                  <CategoryIcon name={c.icon} className="size-6" />
                </span>
                <span className="line-clamp-1">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        {/* Desktop: chips */}
        <ul className="hidden flex-wrap gap-4 md:flex">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/category/${c.slug}`}
                className="flex items-center gap-3 rounded-card border border-line bg-white px-6 py-4 text-sm font-extrabold transition-colors hover:border-brand hover:text-brand"
              >
                {c.name}
                <CategoryIcon name={c.icon} className="size-6 text-brand" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-5" aria-label="پرفروش‌ترین قطعات هفته">
        <SectionHeader title="پرفروش‌ترین قطعات هفته" href="/products?sort=bestselling" linkLabel="مشاهده همه محصولات" />
        <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
          {bestSellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {offers.length > 0 && (
        <section className="flex flex-col gap-5" aria-label="تخفیف‌ها و پیشنهادها">
          <SectionHeader title="تخفیف‌ها و پیشنهادهای ویژه" href="/offers" />
          <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {offers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
