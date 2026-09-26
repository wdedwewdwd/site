import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import type { ProductCardData } from "@/lib/catalog";
import { discountPercent, faDigits, rating, toman } from "@/lib/format";
import { AddToCartButton } from "./AddToCartButton";
import { WishlistButton } from "./WishlistButton";

export function ProductCard({ product, compact = false }: { product: ProductCardData; compact?: boolean }) {
  const off = discountPercent(product.price, product.compareAtPrice);
  const img = product.images[0];
  const inStock = product.stock > 0;
  const href = `/product/${product.slug}`;

  return (
    <article className="card relative flex flex-col gap-3 p-3 md:p-4">
      <div className="relative h-[130px] overflow-hidden rounded-xl bg-surface md:h-[180px]">
        {img ? (
          <Image
            src={img.url}
            alt={img.alt ?? product.name}
            fill
            sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw"
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-x-2 top-2 z-10 flex items-center justify-between">
          {off > 0 ? (
            <span className="rounded-md bg-brand px-2 py-1 text-[11px] font-black text-white">{faDigits(off)}٪</span>
          ) : (
            <span />
          )}
          {!compact && <WishlistButton productId={product.id} />}
        </div>
        {!compact && (
          <span
            className={`absolute bottom-2 right-2 rounded-md px-2 py-1 text-[10px] font-extrabold ${
              inStock ? "bg-success-soft text-success" : "bg-surface text-muted"
            }`}
          >
            {inStock ? "موجود" : "ناموجود"}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11px] font-bold">
            <Star className="size-3 fill-star text-star" aria-hidden />
            {rating(product.ratingAvg)}
            <span className="sr-only">امتیاز</span>
          </span>
          {product.brand && (
            <span className="text-[11px] font-bold text-brand" dir="ltr">
              {product.brand.latin ?? product.brand.name}
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 min-h-[44px] text-[13px] font-extrabold leading-[22px] md:text-sm">
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </h3>
      </div>

      <div className="mt-auto flex items-end justify-between gap-2">
        {/* Sits above the stretched card link. */}
        <div className="relative z-10 hidden md:block">
          <AddToCartButton productId={product.id} disabled={!inStock} />
        </div>
        <div className="flex flex-col items-end gap-0.5">
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <del className="text-[11px] text-muted">{toman(product.compareAtPrice)}</del>
          )}
          <p className="flex items-center gap-1">
            <span className="text-base font-black">{toman(product.price)}</span>
            <span className="text-[10px] text-muted">تومان</span>
          </p>
        </div>
      </div>
      <div className="relative z-10 md:hidden">
        <AddToCartButton productId={product.id} disabled={!inStock} variant="pill" />
      </div>
    </article>
  );
}
