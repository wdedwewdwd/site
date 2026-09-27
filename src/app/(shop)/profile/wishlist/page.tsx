import Link from "next/link";
import { Heart } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { productCardSelect } from "@/lib/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { PageBar } from "@/components/layout/PageBar";

export default async function WishlistPage() {
  const user = await requireUser("/profile/wishlist");
  const items = await db.wishlistItem.findMany({
    where: { userId: user.id, product: { isActive: true } },
    orderBy: { createdAt: "desc" },
    select: { product: { select: productCardSelect } },
  });

  return (
    <>
      <PageBar title="علاقه‌مندی‌ها" backHref="/profile" crumbs={[{ href: "/profile", label: "حساب کاربری" }]} />
    <div className="card flex flex-col gap-5 p-5">
      <h1 className="sr-only text-lg font-black md:not-sr-only">محصولات مورد علاقه من</h1>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Heart className="size-10 text-subtle" />
          <p className="text-sm text-muted">لیست علاقه‌مندی‌های شما خالی است.</p>
          <Link href="/categories" className="btn-ghost">مشاهده محصولات</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3">
          {items.map(({ product }) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
    </>
  );
}
