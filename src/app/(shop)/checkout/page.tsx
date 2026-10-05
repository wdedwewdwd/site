import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getCart } from "@/lib/cart";
import { faDigits } from "@/lib/format";
import { getContact, getShippingConfig } from "@/lib/settings";
import { Steps } from "@/components/checkout/Steps";
import { ShippingStep } from "@/components/checkout/ShippingStep";
import { SummaryRow } from "@/components/cart/SummaryRow";
import { PageBar } from "@/components/layout/PageBar";

export const metadata: Metadata = { title: "اطلاعات ارسال", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const cart = await getCart();
  if (!cart || cart.items.length === 0 || !cart.allAvailable) redirect("/cart");
  const [addresses, shipping, contact] = await Promise.all([
    db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
    getShippingConfig(),
    getContact(),
  ]);

  return (
    <div className="container-page flex flex-col gap-8 py-6 md:py-8">
      <PageBar title="اطلاعات ارسال" backHref="/cart" crumbs={[{ href: "/cart", label: "سبد خرید" }]} />
      <Steps current={2} />
      <h1 className="sr-only">اطلاعات ارسال</h1>
      <ShippingStep
        addresses={addresses}
        methods={shipping.order.filter((k) => shipping.methods[k].enabled).map((key) => ({ key, ...shipping.methods[key] }))}
        orderAmount={cart.subtotal - cart.discount}
        pickupAddress={contact.address}
        summary={
          <dl className="flex flex-col gap-4">
            <SummaryRow label={`قیمت کالاها (${faDigits(cart.count)} کالا)`} value={cart.subtotal} />
            {cart.discount > 0 && <SummaryRow label="تخفیف" value={cart.discount} tone="red" />}
          </dl>
        }
      />
    </div>
  );
}
