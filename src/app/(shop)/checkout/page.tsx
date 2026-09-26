import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getCart } from "@/lib/cart";
import { faDigits } from "@/lib/format";
import { SHIPPING } from "@/lib/shop";
import { Steps } from "@/components/checkout/Steps";
import { ShippingStep } from "@/components/checkout/ShippingStep";
import { SummaryRow } from "@/components/cart/SummaryRow";

export const metadata: Metadata = { title: "اطلاعات ارسال", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const cart = await getCart();
  if (!cart || cart.items.length === 0 || !cart.allAvailable) redirect("/cart");
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });

  return (
    <div className="container-page flex flex-col gap-8 py-6 md:py-8">
      <Steps current={2} />
      <h1 className="sr-only">اطلاعات ارسال</h1>
      <ShippingStep
        addresses={addresses}
        methods={(["EXPRESS", "POST"] as const).map((key) => ({ key, ...SHIPPING[key] }))}
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
