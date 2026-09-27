import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { getCart } from "@/lib/cart";
import { faDigits, toman } from "@/lib/format";
import { MAX_QTY_PER_ITEM } from "@/lib/shop";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { DiscountForm } from "@/components/cart/DiscountForm";
import { ClearCartButton } from "@/components/cart/ClearCartButton";
import { SummaryRow } from "@/components/cart/SummaryRow";
import { PageBar } from "@/components/layout/PageBar";

export const metadata: Metadata = { title: "سبد خرید", robots: { index: false } };

export default async function CartPage() {
  const cart = await getCart();

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-page flex flex-col gap-6 py-6 md:py-10">
        <PageBar title="سبد خرید" backHref="/" />
        <div className="card mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-14 text-center">
          <span className="grid size-24 place-items-center rounded-full bg-brand-soft text-brand">
            <ShoppingCart className="size-10" />
          </span>
          <h1 className="text-xl font-black">سبد خرید شما خالی است!</h1>
          <p className="text-sm text-muted">می‌توانید برای مشاهده محصولات بیشتر به صفحات زیر بروید.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link href="/categories" className="btn-primary">مشاهده دسته‌بندی قطعات</Link>
            <Link href="/offers" className="btn-ghost">تخفیف‌ها و پیشنهادها</Link>
          </div>
        </div>
      </div>
    );
  }

  const payable = cart.subtotal - cart.discount;

  return (
    <div className="container-page flex flex-col gap-6 py-6 md:py-8">
    <PageBar title="سبد خرید" backHref="/" />
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="flex flex-col gap-4" aria-labelledby="cart-title">
        <div className="flex items-center justify-between">
          <h1 id="cart-title" className="text-lg font-black md:text-xl">سبد خرید شما ({faDigits(cart.count)} کالا)</h1>
          <ClearCartButton />
        </div>
        <ul className="flex flex-col gap-4">
          {cart.items.map((i) => (
            <CartItemRow
              key={i.productId}
              productId={i.productId}
              slug={i.product.slug}
              name={i.product.name}
              image={i.product.images[0]}
              brand={i.product.brand?.latin ?? i.product.brand?.name}
              code={i.product.oemCode ?? i.product.sku}
              unitPrice={i.product.price}
              quantity={i.quantity}
              stock={i.product.stock}
              maxQty={MAX_QTY_PER_ITEM}
            />
          ))}
        </ul>
      </section>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:h-fit">
        <div className="card flex flex-col gap-4 p-5">
          <h2 className="border-b border-line pb-4 text-base font-black">خلاصه فاکتور</h2>
          <dl className="flex flex-col gap-4">
            <SummaryRow label={`قیمت کالاها (${faDigits(cart.count)} قطعه)`} value={cart.subtotal + cart.productSavings} />
            {cart.productSavings > 0 && <SummaryRow label="سود شما از تخفیف کالاها" value={cart.productSavings} tone="red" />}
            {cart.discount > 0 && <SummaryRow label="کد تخفیف" value={cart.discount} tone="red" />}
            <div className="flex items-center justify-between text-[13px]">
              <dt className="text-muted">هزینه ارسال</dt>
              <dd className="text-xs text-muted">در مرحله بعد محاسبه می‌شود</dd>
            </div>
            <div className="border-t border-dashed border-line pt-4">
              <SummaryRow label="مبلغ قابل پرداخت" value={payable} strong />
            </div>
          </dl>
          {!cart.allAvailable && (
            <p className="rounded-lg bg-brand-soft p-3 text-xs font-bold text-brand" role="alert">
              موجودی برخی کالاها تغییر کرده است. لطفاً تعداد را اصلاح کنید.
            </p>
          )}
          {cart.allAvailable ? (
            <Link href="/checkout" className="btn-primary w-full py-3.5 text-base shadow-[0_8px_20px_-8px_rgba(213,34,34,0.6)]">
              ادامه فرآیند خرید
            </Link>
          ) : (
            <span className="btn-primary w-full cursor-not-allowed py-3.5 text-base opacity-50" aria-disabled>ادامه فرآیند خرید</span>
          )}
          <p className="text-center text-[11px] text-muted">مبلغ نهایی {toman(payable)} تومان بدون احتساب هزینه ارسال</p>
        </div>
        <DiscountForm applied={cart.discountCode} error={cart.discountError} />
      </aside>
    </div>
    </div>
  );
}
