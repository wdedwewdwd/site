import { db } from "@/lib/db";
import { productCardSelect } from "@/lib/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { HeroBanners } from "@/components/home/HeroBanners";
import { getHomeBanners } from "@/lib/banners";
import { getMakerSections } from "@/lib/home-makers";
import { MakerPicker } from "@/components/home/MakerPicker";

export default async function HomePage() {
  const [hero, makers, bestSellers, offers] = await Promise.all([
    getHomeBanners(),
    getMakerSections(),
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

      <MakerPicker makers={makers} />

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
