import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Circle, CreditCard } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { faDateTime, faDigits, toman } from "@/lib/format";
import { getShippingConfig } from "@/lib/settings";
import { shippingBadge } from "@/lib/shipping-shared";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryRow } from "@/components/cart/SummaryRow";
import { PayAgainButton } from "@/components/checkout/PayAgainButton";
import { CopyButton } from "@/components/ui/CopyButton";
import type { OrderStatus } from "@/generated/prisma/client";
import { PageBar } from "@/components/layout/PageBar";

const TIMELINE: { status: OrderStatus; label: string }[] = [
  { status: "PAID", label: "ثبت و پرداخت سفارش" },
  { status: "PROCESSING", label: "تأیید فاکتور و آماده‌سازی" },
  { status: "SHIPPED", label: "تحویل به مأمور ارسال" },
  { status: "DELIVERED", label: "تحویل به مشتری" },
];

export default async function OrderDetailPage({ params }: PageProps<"/profile/orders/[number]">) {
  const user = await requireUser("/profile/orders");
  const number = Number((await params).number);
  if (!Number.isSafeInteger(number) || number < 1) notFound();

  // userId in the filter: users can only ever see their own orders.
  const order = await db.order.findFirst({
    where: { number, userId: user.id },
    include: {
      items: { include: { product: { select: { slug: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } } } },
      events: { orderBy: { createdAt: "asc" } },
      payments: { where: { status: "SUCCEEDED" }, take: 1 },
    },
  });
  if (!order) notFound();

  const shipping = await getShippingConfig();
  const reached = (s: OrderStatus) => order.events.find((e) => e.status === s);
  const cancelled = order.status === "CANCELLED" || order.status === "REFUNDED";

  return (
    <>
      <PageBar title={`سفارش #${faDigits(order.number)}`} backHref="/profile/orders" crumbs={[{ href: "/profile", label: "حساب کاربری" }, { href: "/profile/orders", label: "سفارش‌های من" }]} />
    <div className="flex flex-col gap-5">
      <section className="card flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="sr-only text-lg font-black md:not-sr-only">جزئیات سفارش #{faDigits(order.number)}</h1>
            <StatusBadge status={order.status} />
          </div>
          {(order.trackingCode || order.carrier) && (
            <span className="flex flex-wrap items-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs font-bold">
              {order.carrier && <span>{order.carrier}</span>}
              {order.trackingCode && (
                <>
                  <span>کد رهگیری: <span dir="ltr">{order.trackingCode}</span></span>
                  <CopyButton value={order.trackingCode} />
                  {order.carrier?.startsWith("پست") && (
                    <a href="https://tracking.post.ir/" target="_blank" rel="noopener noreferrer" className="text-info hover:underline">پیگیری در سایت پست</a>
                  )}
                </>
              )}
            </span>
          )}
        </div>

        {order.status === "PENDING_PAYMENT" && order.paymentMethod === "ONLINE" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-soft p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-brand">
              <CreditCard className="size-5" /> پرداخت این سفارش انجام نشده است.
            </p>
            <PayAgainButton orderId={order.id} />
          </div>
        )}

        {!cancelled && order.status !== "PENDING_PAYMENT" && (
          <ol className="grid gap-4 sm:grid-cols-4" aria-label="مراحل سفارش">
            {TIMELINE.map((step) => {
              const ev = reached(step.status);
              return (
                <li key={step.status} className="flex items-center gap-3 sm:flex-col sm:text-center">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full ${ev ? "bg-success text-white" : "bg-surface text-subtle"}`}>
                    {ev ? <Check className="size-5" /> : <Circle className="size-4" />}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className={`text-[13px] font-extrabold ${ev ? "" : "text-muted"}`}>{step.label}</span>
                    {ev && <span className="text-[11px] text-muted">{faDateTime(ev.createdAt)}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="card flex flex-col p-5" aria-labelledby="items">
          <h2 id="items" className="mb-3 text-base font-black">اقلام سفارش</h2>
          <ul className="divide-y divide-line">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 py-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                  {i.product?.images[0] && <Image src={i.product.images[0].url} alt="" fill sizes="56px" className="object-cover" />}
                </span>
                <span className="flex flex-1 flex-col gap-1">
                  {i.product ? (
                    <Link href={`/product/${i.product.slug}`} className="text-sm font-extrabold hover:text-brand">{i.name}</Link>
                  ) : (
                    <span className="text-sm font-extrabold">{i.name}</span>
                  )}
                  <span className="text-xs text-muted">{faDigits(i.quantity)} عدد × {toman(i.unitPrice)} تومان</span>
                </span>
                <span className="text-sm font-black">{toman(i.unitPrice * i.quantity)}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="flex flex-col gap-5">
          <section className="card flex flex-col gap-3 p-5 text-[13px]" aria-labelledby="delivery">
            <h2 id="delivery" className="text-base font-black">اطلاعات تحویل و مرسوله</h2>
            <p><span className="text-muted">تحویل‌گیرنده: </span>{order.receiverName} (<span dir="ltr">{faDigits(order.receiverPhone)}</span>)</p>
            <p className="leading-7"><span className="text-muted">{order.shippingMethod === "PICKUP" ? "محل تحویل: " : "نشانی ارسال: "}</span>{order.province}، {order.city}، {order.fullAddress}{order.postalCode && <> — کد پستی {faDigits(order.postalCode)}</>}</p>
            <p><span className="text-muted">روش ارسال: </span>{shipping.methods[order.shippingMethod].title}</p>
            <p><span className="text-muted">روش پرداخت: </span>{order.paymentMethod === "ONLINE" ? "درگاه آنلاین بانکی" : "پرداخت در محل"}</p>
            {order.payments[0]?.refId && (
              <p><span className="text-muted">کد پیگیری پرداخت: </span><span dir="ltr">{faDigits(order.payments[0].refId)}</span></p>
            )}
          </section>
          <section className="card p-5" aria-label="خلاصه مالی">
            <dl className="flex flex-col gap-3">
              <SummaryRow label="جمع کالاها" value={order.subtotal} />
              {order.discount > 0 && <SummaryRow label="تخفیف" value={order.discount} tone="red" />}
              <SummaryRow label="هزینه ارسال" value={order.shippingCost} text={shippingBadge(order.shippingCost, order.shippingCollect)} />
              <div className="border-t border-dashed border-line pt-3">
                <SummaryRow label="مبلغ کل" value={order.total} strong />
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
    </>
  );
}
