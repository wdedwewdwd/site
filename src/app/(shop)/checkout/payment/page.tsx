import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getCart } from "@/lib/cart";
import { faDigits } from "@/lib/format";
import { SHIPPING } from "@/lib/shop";
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
  const shipping = sp.shipping === "EXPRESS" || sp.shipping === "POST" ? sp.shipping : null;
  if (!addressId || !shipping) redirect("/checkout");

  const [cart, address] = await Promise.all([getCart(), db.address.findFirst({ where: { id: addressId, userId: user.id } })]);
  if (!cart || cart.items.length === 0 || !cart.allAvailable) redirect("/cart");
  if (!address) redirect("/checkout");

  const shippingCost = SHIPPING[shipping].price;
  const total = cart.subtotal - cart.discount + shippingCost;

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
        addressId={addressId}
        shipping={shipping}
        total={total}
        onlineEnabled={onlinePaymentEnabled()}
        summary={
          <dl className="flex flex-col gap-4">
            <SummaryRow label={`قیمت کالاها (${faDigits(cart.count)} کالا)`} value={cart.subtotal} />
            {cart.discount > 0 && <SummaryRow label="تخفیف" value={cart.discount} tone="red" />}
            <SummaryRow label="هزینه ارسال" value={shippingCost} />
            <div className="border-t border-dashed border-line pt-4">
              <SummaryRow label="مبلغ قابل پرداخت" value={total} strong />
            </div>
            <p className="text-xs leading-6 text-muted">ارسال به: {address.receiverName} — {address.city}، {address.fullAddress}</p>
          </dl>
        }
      />
    </div>
  );
}
