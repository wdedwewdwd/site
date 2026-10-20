import { db } from "@/lib/db";
import { productCardSelect } from "@/lib/catalog";
import { getContact } from "@/lib/settings";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { HeroBanners } from "@/components/home/HeroBanners";
import { getHomeBanners } from "@/lib/banners";
import { getMakerSections } from "@/lib/home-makers";
import { getCategoryRails, getMixedPicks, getPopularSubcategories } from "@/lib/home-sections";
import { MakerPicker } from "@/components/home/MakerPicker";
import { FeatureStrip } from "@/components/home/FeatureStrip";
import { PopularParts } from "@/components/home/PopularParts";
import { ProductRail } from "@/components/home/ProductRail";
import { HelpCta } from "@/components/home/HelpCta";
import { faDigits } from "@/lib/format";

export default async function HomePage() {
  const [hero, makers, contact, sold, rails, popular, offers] = await Promise.all([
    getHomeBanners(),
    getMakerSections(),
    getContact(),
    // Shop window: only products with a photo that have really sold.
    db.product.findMany({
      where: { isActive: true, soldCount: { gt: 0 }, images: { some: {} } },
      orderBy: [{ soldCount: "desc" }, { position: "asc" }],
      take: 8,
      select: productCardSelect,
    }),
    getCategoryRails(12),
    getPopularSubcategories(13),
    db.product.findMany({
      where: { isActive: true, compareAtPrice: { not: null }, stock: { gt: 0 } },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: productCardSelect,
    }),
  ]);
  // Until enough has sold for a real best-seller list, the same place shows a mix from the whole catalogue.
  const bestsellers = sold.length >= 4;
  const picks = bestsellers ? sold : await getMixedPicks(8);
  const [firstRails, lastRails] = [rails.slice(0, 2), rails.slice(2)];

  const rail = (r: (typeof rails)[number]) => (
    <section key={r.slug} className="flex flex-col gap-4" aria-labelledby={`rail-${r.slug}`}>
      <SectionHeader title={r.name} titleId={`rail-${r.slug}`} href={`/category/${r.slug}`} linkLabel={`مشاهده همه ${faDigits(r.total)} قطعه`} />
      <ProductRail label={r.name}>
        {r.products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </ProductRail>
    </section>
  );

  return (
    <div className="container-page flex flex-col gap-8 py-4 md:gap-12 md:py-8">
      <h1 className="sr-only">آریزون یدک | فروشگاه آنلاین قطعات یدکی خودرو</h1>
      <HeroBanners layout={hero.layout} banners={hero.banners} autoplay={hero.autoplay} />

      <FeatureStrip hours={contact.hours} />

      <MakerPicker makers={makers} />

      <PopularParts items={popular} />

      {picks.length > 0 && (
        <section className="flex flex-col gap-4" aria-labelledby="picks-title">
          <SectionHeader
            title={bestsellers ? "پرفروش‌ترین قطعات" : "منتخب قطعات آریزون یدک"}
            titleId="picks-title"
            href={bestsellers ? "/products?sort=bestselling" : "/products"}
            linkLabel="مشاهده همه محصولات"
          />
          <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {picks.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {firstRails.map(rail)}

      {offers.length > 0 && (
        <section className="flex flex-col gap-4" aria-labelledby="offers-title">
          <SectionHeader title="تخفیف‌ها و پیشنهادهای ویژه" titleId="offers-title" href="/offers" />
          <ProductRail label="تخفیف‌ها و پیشنهادهای ویژه">
            {offers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ProductRail>
        </section>
      )}

      {lastRails.map(rail)}

      <HelpCta phone={contact.phone} phoneDisplay={contact.phoneDisplay} />
    </div>
  );
}
