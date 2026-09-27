import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BadgeCheck, Bell, Star } from "lucide-react";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth/session";
import { productCardSelect } from "@/lib/catalog";
import { faDate, faDigits, rating, toman } from "@/lib/format";
import { SITE } from "@/lib/shop";
import { Gallery } from "@/components/product/Gallery";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { WishlistButton } from "@/components/product/WishlistButton";
import { ProductCard } from "@/components/product/ProductCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { ShareButton } from "@/components/product/ShareButton";
import { PageBar } from "@/components/layout/PageBar";

const getProduct = cache(async (slug: string) => {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  return db.product.findFirst({
    where: { slug, isActive: true },
    include: {
      brand: true,
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      fitments: { include: { carModel: true } },
      reviews: {
        where: { approved: true },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
  });
});

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description?.slice(0, 160),
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { images: product.images[0] ? [product.images[0].url] : [] },
  };
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [user, related] = await Promise.all([
    getUser(),
    db.product.findMany({
      where: { isActive: true, categoryId: product.categoryId, id: { not: product.id } },
      orderBy: { soldCount: "desc" },
      take: 4,
      select: productCardSelect,
    }),
  ]);
  const saved = user
    ? !!(await db.wishlistItem.findUnique({ where: { userId_productId: { userId: user.id, productId: product.id } } }))
    : false;

  const inStock = product.stock > 0;
  const specs: { label: string; value: string }[] = [
    ...(product.oemCode ? [{ label: "کد فنی (OEM)", value: product.oemCode }] : []),
    ...(product.weightGrams ? [{ label: "وزن بسته", value: `${faDigits((product.weightGrams / 1000).toFixed(1))} کیلوگرم` }] : []),
    ...(product.warranty ? [{ label: "ضمانت", value: product.warranty }] : []),
    ...(product.madeIn ? [{ label: "کشور سازنده", value: product.madeIn }] : []),
    ...((Array.isArray(product.specs) ? product.specs : []) as { label: string; value: string }[]),
  ];

  return (
    <div className="container-page flex flex-col gap-10 py-6 md:py-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          sku: product.sku,
          mpn: product.oemCode ?? undefined,
          brand: product.brand ? { "@type": "Brand", name: product.brand.latin ?? product.brand.name } : undefined,
          image: product.images.map((i) => i.url),
          description: product.description ?? undefined,
          aggregateRating:
            product.ratingCount > 0 ? { "@type": "AggregateRating", ratingValue: product.ratingAvg, reviewCount: product.ratingCount } : undefined,
          offers: {
            "@type": "Offer",
            priceCurrency: "IRR",
            price: product.price * 10,
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        }}
      />
      <PageBar
        title={product.name}
        mobileTitle="جزئیات قطعه"
        backHref={`/category/${product.category.slug}`}
        crumbs={[
          { href: "/categories", label: "دسته‌بندی‌ها" },
          { href: `/category/${product.category.slug}`, label: product.category.name }
        ]}
        actions={<ShareButton title={product.name} />}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_480px] lg:gap-10">
        {/* Info column (right in RTL) */}
        <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-1">
          <div className="flex flex-col gap-4 border-b border-line pb-5">
            <div className="flex flex-wrap items-center gap-2">
              {product.brand && (
                <span className="text-xs font-bold text-brand">
                  {product.brand.name} | {product.brand.latin}
                </span>
              )}
              <span className="flex items-center gap-1 rounded-md bg-success-soft px-2 py-1 text-[11px] font-bold text-success">
                <BadgeCheck className="size-3.5" /> اصلی ۱۰۰٪ تضمین شده
              </span>
            </div>
            <h1 className="text-xl font-black leading-relaxed md:text-2xl">{product.name}</h1>
            <p className="flex items-center gap-1.5 text-sm">
              <Star className="size-4 fill-star text-star" aria-hidden />
              <span className="font-bold">{rating(product.ratingAvg)}</span>
              <span className="text-xs text-muted">({faDigits(product.ratingCount)} دیدگاه از کاربران)</span>
              <span className="mr-auto">
                <WishlistButton productId={product.id} initial={saved} className="border border-line shadow-none" />
              </span>
            </p>
          </div>

          <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex flex-col gap-1">
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <del className="text-xs text-muted">{toman(product.compareAtPrice)} تومان</del>
              )}
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-brand">{toman(product.price)}</span>
                <span className="text-xs text-muted">تومان</span>
              </p>
            </div>
            {inStock ? (
              <div className="flex flex-wrap gap-3">
                <AddToCartButton productId={product.id} variant="full" />
                <AddToCartButton productId={product.id} variant="full" buyNow />
              </div>
            ) : (
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-lg bg-surface px-3 py-1.5 text-sm font-extrabold text-muted">ناموجود</span>
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Bell className="size-3.5" /> به‌زودی موجود می‌شود
                </span>
              </div>
            )}
          </div>

          {specs.length > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby="specs">
              <h2 id="specs" className="text-base font-black">مشخصات فنی قطعه</h2>
              <dl className="card divide-y divide-line overflow-hidden text-[13px]">
                {specs.map((s) => (
                  <div key={s.label} className="flex items-center justify-between px-4 py-3">
                    <dt className="text-muted">{s.label}</dt>
                    <dd className="font-bold" dir="auto">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {product.fitments.length > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby="fits">
              <h2 id="fits" className="text-base font-black">خودروهای سازگار</h2>
              <ul className="flex flex-wrap gap-2">
                {product.fitments.map((f) => (
                  <li key={f.carModelId} className="rounded-full bg-surface px-4 py-2 text-xs font-bold">
                    {f.carModel.name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {product.description && (
            <section className="flex flex-col gap-3" aria-labelledby="desc">
              <h2 id="desc" className="text-base font-black">معرفی محصول</h2>
              <p className="whitespace-pre-line text-sm leading-8 text-muted">{product.description}</p>
            </section>
          )}

          <p className="text-xs text-muted">
            ارسال با ضمانت اصالت و فاکتور رسمی {SITE.name} — امکان بازگرداندن کالا تا ۷ روز طبق{" "}
            <a href="/returns" className="font-bold text-brand hover:underline">رویه بازگرداندن کالا</a>
          </p>
        </div>

        {/* Gallery column (left in RTL) */}
        <div className="order-first lg:order-none lg:col-start-2 lg:row-start-1">
          <Gallery images={product.images} name={product.name} />
        </div>
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="reviews">
        <h2 id="reviews" className="text-base font-black md:text-lg">نظرات کاربران</h2>
        {product.reviews.length === 0 ? (
          <p className="card p-6 text-sm text-muted">هنوز دیدگاهی برای این محصول ثبت نشده است.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {product.reviews.map((r) => (
              <article key={r.id} className="card flex flex-col gap-3 p-4">
                <div className="flex gap-0.5" aria-label={`امتیاز ${r.rating} از ۵`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={`size-4 ${i < r.rating ? "fill-star text-star" : "text-line"}`} aria-hidden />
                  ))}
                </div>
                <p className="text-[13px] leading-7">{r.body}</p>
                <p className="mt-auto text-xs text-muted">
                  {[r.user.firstName, r.user.lastName?.[0] ? `${r.user.lastName[0]}.` : ""].filter(Boolean).join(" ") || "کاربر"} · {faDate(r.createdAt)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="flex flex-col gap-4" aria-labelledby="related">
          <h2 id="related" className="text-base font-black md:text-lg">محصولات مرتبط</h2>
          <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
