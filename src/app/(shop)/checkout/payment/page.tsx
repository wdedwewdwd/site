import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getCart } from "@/lib/cart";
import { faDigits } from "@/lib/format";
import { getShippingConfig } from "@/lib/settings";
import { needsAddress, quoteShipping, shippingBadge, SHIPPING_METHODS } from "@/lib/shipping-shared";
import type { ShippingMethod } from "@/generated/prisma/client";
import { onlinePaymentEnabled } from "@/lib/payment";
import { idSchema } from "@/lib/validation";
import { Steps } from "@/components/checkout/Steps";
import { PaymentStep } from "@/components/checkout/PaymentStep";
import { SummaryRow } from "@/components/cart/SummaryRow";
import { PageBar } from "@/components/layout/PageBar";

export const metadata: Metadata = { title: "روش پرداخت", robots: { index: false } };

export default async function CheckoutPaymentPage({ searchParams }: PageProps<"/checkout/payment">) {
  const user = await requireUser("/checkout");
  const sp = await searchParams;
  const addressId = typeof sp.address === "string" && idSchema.safeParse(sp.address).success ? sp.address : null;
  const shipping = SHIPPING_METHODS.find((m) => m === sp.shipping) as ShippingMethod | undefined;
  if (!shipping || (needsAddress(shipping) && !addressId)) redirect("/checkout");

  const [cart, address, config] = await Promise.all([
    getCart(),
    addressId ? db.address.findFirst({ where: { id: addressId, userId: user.id } }) : null,
    getShippingConfig(),
  ]);
  if (!cart || cart.items.length === 0 || !cart.allAvailable) redirect("/cart");
  const method = config.methods[shipping];
  if (!method.enabled || (addressId && !address) || (needsAddress(shipping) && !address) || (method.tehranOnly && address?.province !== "تهران")) redirect("/checkout");

  const quote = quoteShipping(method, cart.subtotal - cart.discount);
  const total = cart.subtotal - cart.discount + quote.cost;

  return (
    <div className="container-page flex flex-col gap-8 py-6 md:py-8">
      <PageBar
        title="روش پرداخت"
        backHref="/checkout"
        crumbs={[{ href: "/cart", label: "سبد خرید" }, { href: "/checkout", label: "اطلاعات ارسال" }]}
      />
      <Steps current={3} />
      <h1 className="sr-only">روش پرداخت</h1>
      <PaymentStep
        addressId={addressId ?? ""}
        shipping={shipping}
        total={total}
        onlineEnabled={onlinePaymentEnabled()}
        summary={
          <dl className="flex flex-col gap-4">
            <SummaryRow label={`قیمت کالاها (${faDigits(cart.count)} کالا)`} value={cart.subtotal} />
            {cart.discount > 0 && <SummaryRow label="تخفیف" value={cart.discount} tone="red" />}
            <SummaryRow label={`ارسال — ${method.title}`} value={quote.cost} text={shippingBadge(quote.cost, quote.collect)} />
            <div className="border-t border-dashed border-line pt-4">
              <SummaryRow label="مبلغ قابل پرداخت" value={total} strong />
            </div>
            {quote.collect && <p className="text-[11px] leading-5 text-muted">کرایه ارسال هنگام تحویل مستقیماً به شرکت حمل پرداخت می‌شود.</p>}
            <p className="text-xs leading-6 text-muted">
              {needsAddress(shipping) && address ? <>ارسال به: {address.receiverName} — {address.city}، {address.fullAddress}</> : "تحویل حضوری از فروشگاه؛ پس از آماده شدن سفارش با شما تماس می‌گیریم."}
            </p>
          </dl>
        }
      />
    </div>
  );
}
