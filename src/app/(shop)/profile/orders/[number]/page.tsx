import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Ban, Check, CreditCard, Download, FileText, Headset, History, MapPin, Star, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { faDigits, toman } from "@/lib/format";
import { buildInvoice, invoiceDate, invoiceInclude } from "@/lib/invoice";
import { customerReason } from "@/lib/order-flow";
import { expireStaleOrders, PAYMENT_WINDOW_MIN, paymentSecondsLeft } from "@/lib/orders";
import { getContact, getShippingConfig, hideOutOfStock } from "@/lib/settings";
import { needsAddress } from "@/lib/shipping-shared";
import { ORDER_STATUS } from "@/lib/shop";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PayAgainButton } from "@/components/checkout/PayAgainButton";
import { CopyButton } from "@/components/ui/CopyButton";
import { CancelOrderButton, PaymentCountdown, ReorderButton } from "@/components/orders/OrderButtons";
import { PageBar } from "@/components/layout/PageBar";
import type { OrderStatus } from "@/generated/prisma/client";

// How far along an order is; cancelled and refunded orders leave this path.
const RANK: Partial<Record<OrderStatus, number>> = { PENDING_PAYMENT: 0, PAID: 1, PROCESSING: 2, SHIPPED: 3, DELIVERED: 4 };

export default async function OrderDetailPage({ params, searchParams }: PageProps<"/profile/orders/[number]">) {
  const user = await requireUser("/profile/orders");
  const number = Number((await params).number);
  if (!Number.isSafeInteger(number) || number < 1) notFound();
  const payFailed = (await searchParams).pay === "failed";

  // An unpaid order past its payment window is cancelled before it is shown, so the page never offers a dead payment.
  await expireStaleOrders();
  // userId in the filter: users can only ever see their own orders.
  const order = await db.order.findFirst({
    where: { number, userId: user.id },
    include: {
      ...invoiceInclude,
      items: { orderBy: { id: "asc" }, include: { product: { select: { slug: true, isActive: true, stock: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } } } },
      events: { orderBy: { createdAt: "asc" }, select: { id: true, status: true, note: true, createdAt: true } },
    },
  });
  if (!order) notFound();

  const [contact, shipping, hide] = await Promise.all([getContact(), getShippingConfig(), hideOutOfStock()]);
  const invoice = buildInvoice(order, contact, shipping);
  const pickup = !needsAddress(order.shippingMethod);
  const pending = order.status === "PENDING_PAYMENT";
  const closed = order.status === "CANCELLED" || order.status === "REFUNDED";
  const secondsLeft = paymentSecondsLeft(order.createdAt);
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const lastEvent = (s: OrderStatus) => order.events.findLast((e) => e.status === s);
  const closedEvent = closed ? lastEvent(order.status) : undefined;
  const reason = customerReason(closedEvent?.note);
  const pdf = `/api/orders/${order.number}/invoice`;

  const steps: { status: OrderStatus; label: string }[] = [
    { status: "PENDING_PAYMENT", label: "ثبت سفارش" },
    { status: "PAID", label: "پرداخت" },
    { status: "PROCESSING", label: pickup ? "آماده‌سازی برای تحویل" : "آماده‌سازی و بسته‌بندی" },
    ...(pickup ? [] : [{ status: "SHIPPED" as const, label: "تحویل به مأمور ارسال" }]),
    { status: "DELIVERED", label: pickup ? "تحویل در فروشگاه" : "تحویل به شما" },
  ];
  const current = RANK[order.status] ?? -1;
  const stepDate = (s: OrderStatus) => (s === "PENDING_PAYMENT" ? order.createdAt : s === "PAID" ? (order.paidAt ?? lastEvent(s)?.createdAt) : lastEvent(s)?.createdAt);

  return (
    <>
      <PageBar
        title={`سفارش #${faDigits(order.number)}`}
        backHref="/profile/orders"
        crumbs={[{ href: "/profile", label: "حساب کاربری" }, { href: "/profile/orders", label: "سفارش‌های من" }]}
      />
      <div className="flex flex-col gap-5">
        <section className="card flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-lg font-black">سفارش #{faDigits(order.number)}</h1>
                <StatusBadge status={order.status} />
              </div>
              {/* Commas rather than «·», which reads like a Persian zero next to numbers. */}
              <p className="text-xs leading-6 text-muted">
                ثبت شده در {invoiceDate(order.createdAt)}، {faDigits(itemCount)} کالا، {toman(order.total)} تومان
              </p>
            </div>
          </div>
          {/* Two columns on phones (the main button takes a whole row), one wrapping row from tablets up. */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {pending && <PayAgainButton orderId={order.id} className="btn-primary col-span-2 px-4 py-2.5 text-sm" />}
            <Link href={`/profile/orders/${order.number}/invoice`} className="btn-ghost px-3 py-2.5 text-sm sm:px-4">
              <FileText className="size-4 shrink-0" aria-hidden />
              <span>
                <span className="hidden sm:inline">مشاهده </span>
                {invoice.title}
              </span>
            </Link>
            <a href={pdf} download={invoice.fileName} className="btn-ghost px-3 py-2.5 text-sm sm:px-4">
              <Download className="size-4 shrink-0" aria-hidden />
              دانلود PDF
            </a>
            {!pending && <ReorderButton orderId={order.id} className="btn-ghost px-3 py-2.5 text-sm sm:px-4" />}
            <Link href={`/profile/support/new?order=${order.number}`} className="btn-ghost px-3 py-2.5 text-sm sm:px-4">
              <Headset className="size-4 shrink-0" aria-hidden />
              پشتیبانی سفارش
            </Link>
            {pending && <CancelOrderButton orderId={order.id} number={order.number} className="btn-ghost px-3 py-2.5 text-sm sm:px-4" />}
          </div>

          {pending && (
            <div className="flex flex-col gap-2 rounded-xl bg-brand-soft p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-sm font-bold leading-6 text-brand">
                <CreditCard className="mt-0.5 size-5 shrink-0" aria-hidden />
                {payFailed
                  ? "اتصال به درگاه پرداخت برقرار نشد. دوباره دکمهٔ «پرداخت مجدد» را بزنید."
                  : `پرداخت این سفارش انجام نشده است. اگر تا ${faDigits(PAYMENT_WINDOW_MIN)} دقیقه پس از ثبت پرداخت نشود، خودکار لغو می‌شود.`}
              </p>
              <PaymentCountdown seconds={secondsLeft} />
            </div>
          )}

          {closed && (
            <div className="flex items-start gap-3 rounded-xl bg-surface p-4 text-sm leading-7">
              <Ban className="mt-1 size-5 shrink-0 text-muted" aria-hidden />
              <div>
                <p className="font-extrabold">
                  {order.status === "REFUNDED" ? "کالاهای این سفارش مرجوع شده است" : "این سفارش لغو شده است"}
                  {closedEvent && <span className="font-normal text-muted"> — {invoiceDate(closedEvent.createdAt)}</span>}
                </p>
                {reason && <p className="text-muted">علت: {reason}</p>}
                {order.paidAt && (
                  <p className="text-muted">برای پیگیری بازگشت مبلغ پرداختی، از دکمهٔ «پشتیبانی سفارش» استفاده کنید.</p>
                )}
              </div>
            </div>
          )}

          {!closed && (
            <ol className={`grid gap-3 border-t border-line pt-4 ${steps.length === 5 ? "sm:grid-cols-5" : "sm:grid-cols-4"}`} aria-label="مراحل سفارش">
              {steps.map((step, i) => {
                const rank = RANK[step.status]!;
                const done = rank <= current;
                const date = done ? stepDate(step.status) : undefined;
                const isCurrent = rank === current;
                return (
                  <li key={step.status} className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
                    {/* Line to the next step: down on phones, sideways (to the left) from tablets up. */}
                    {i < steps.length - 1 && (
                      <span
                        aria-hidden
                        className={`absolute right-[17px] top-10 h-[calc(100%-32px)] w-0.5 sm:right-[calc(50%+22px)] sm:top-[17px] sm:h-0.5 sm:w-[calc(100%-32px)] ${
                          RANK[steps[i + 1].status]! <= current ? "bg-success" : "bg-line"
                        }`}
                      />
                    )}
                    <span
                      className={`relative grid size-9 shrink-0 place-items-center rounded-full text-sm font-black ${
                        done ? "bg-success text-white" : "border-2 border-line bg-white text-subtle"
                      } ${isCurrent && step.status !== "DELIVERED" ? "ring-4 ring-success-soft" : ""}`}
                    >
                      {done ? <Check className="size-5" aria-hidden /> : faDigits(i + 1)}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className={`text-[13px] font-extrabold ${done ? "" : "text-muted"}`}>{step.label}</span>
                      {date && <span className="text-[11px] text-muted">{invoiceDate(date)}</span>}
                      {isCurrent && !date && <span className="text-[11px] text-muted">مرحلهٔ فعلی</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {(order.trackingCode || order.carrier) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-info-soft px-4 py-3 text-[13px]">
              <span className="flex items-center gap-2 font-extrabold text-info">
                <Truck className="size-5" aria-hidden />
                {order.carrier ? `ارسال با ${order.carrier}` : "مرسوله ارسال شد"}
              </span>
              {order.trackingCode && (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-muted">کد رهگیری:</span>
                  <span className="font-black" dir="ltr">{faDigits(order.trackingCode)}</span>
                  <CopyButton value={order.trackingCode} />
                  {order.carrier?.startsWith("پست") && (
                    <a href="https://tracking.post.ir/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-info hover:underline">
                      پیگیری در سایت پست
                    </a>
                  )}
                </span>
              )}
            </div>
          )}
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-5">
            <section className="card flex flex-col p-5" aria-labelledby="items">
              <h2 id="items" className="mb-2 text-base font-black">
                اقلام سفارش <span className="text-sm font-bold text-muted">({faDigits(order.items.length)} قلم)</span>
              </h2>
              <ul className="divide-y divide-line">
                {order.items.map((i) => {
                  const href = i.product?.isActive && (!hide || i.product.stock > 0) ? `/product/${i.product.slug}` : null;
                  return (
                    <li key={i.id} className="flex items-center gap-4 py-3.5">
                      <span className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-line bg-surface">
                        {i.product?.images[0] && <Image src={i.product.images[0].url} alt="" fill sizes="64px" className="object-cover" />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        {href ? (
                          <Link href={href} className="text-sm font-extrabold leading-6 hover:text-brand">{i.name}</Link>
                        ) : (
                          <span className="text-sm font-extrabold leading-6">{i.name}</span>
                        )}
                        <span className="text-xs text-muted">
                          کد کالا: <span dir="ltr">{i.sku}</span>
                        </span>
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <span>
                            {faDigits(i.quantity)} عدد × {toman(i.unitPrice)} تومان
                          </span>
                          {order.status === "DELIVERED" && href && (
                            <Link href={`${href}#reviews`} className="flex items-center gap-1 font-bold text-brand hover:underline">
                              <Star className="size-3.5" aria-hidden />
                              ثبت نظر
                            </Link>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-black">{toman(i.unitPrice * i.quantity)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="card flex flex-col gap-3 p-5" aria-labelledby="history">
              <h2 id="history" className="flex items-center gap-2 text-base font-black">
                <History className="size-5 text-muted" aria-hidden />
                تاریخچهٔ سفارش
              </h2>
              <ol className="flex flex-col">
                {[...order.events].reverse().map((e, i) => {
                  const why = e.status === "CANCELLED" || e.status === "REFUNDED" ? customerReason(e.note) : null;
                  return (
                    <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < order.events.length - 1 && <span aria-hidden className="absolute right-[5px] top-4 h-full w-px bg-line" />}
                      <span aria-hidden className={`relative mt-1.5 size-[11px] shrink-0 rounded-full ${i === 0 ? "bg-brand" : "bg-line"}`} />
                      <span className="flex flex-col gap-0.5 text-[13px]">
                        <span className="font-extrabold">{e.status === "PENDING_PAYMENT" ? "ثبت سفارش" : ORDER_STATUS[e.status].label}</span>
                        {why && <span className="text-xs text-muted">علت: {why}</span>}
                        <span className="text-[11px] text-muted">{invoiceDate(e.createdAt)}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>

          <aside className="flex flex-col gap-5">
            <section className="card flex flex-col gap-3 p-5" aria-labelledby="invoice">
              <h2 id="invoice" className="flex items-center gap-2 text-base font-black">
                <FileText className="size-5 text-brand" aria-hidden />
                {invoice.title} شماره {invoice.number}
              </h2>
              <p className="text-xs leading-6 text-muted">
                {invoice.kind === "proforma" ? "پس از پرداخت، فاکتور فروش صادر می‌شود." : `صادر شده در ${invoice.issued}`}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/profile/orders/${order.number}/invoice`} className="btn-ghost px-3 py-2.5 text-xs">مشاهده</Link>
                <a href={pdf} download={invoice.fileName} className="btn-primary px-3 py-2.5 text-xs">
                  <Download className="size-4" aria-hidden />
                  دانلود PDF
                </a>
              </div>
            </section>

            <section className="card flex flex-col gap-2.5 p-5 text-[13px] leading-6" aria-labelledby="delivery">
              <h2 id="delivery" className="flex items-center gap-2 text-base font-black">
                <MapPin className="size-5 text-muted" aria-hidden />
                {pickup ? "تحویل حضوری" : "اطلاعات ارسال"}
              </h2>
              <p>
                <span className="text-muted">تحویل‌گیرنده: </span>
                {order.receiverName} (<span dir="ltr">{faDigits(order.receiverPhone)}</span>)
              </p>
              <p>
                <span className="text-muted">{pickup ? "محل تحویل: " : "نشانی: "}</span>
                {pickup ? order.fullAddress : `${order.province}، ${order.city}، ${order.fullAddress}`}
              </p>
              {!pickup && (
                <p>
                  <span className="text-muted">کد پستی: </span>
                  {order.postalCode ? faDigits(order.postalCode) : "ثبت نشده"}
                </p>
              )}
              <p>
                <span className="text-muted">روش ارسال: </span>
                {shipping.methods[order.shippingMethod].title}
              </p>
            </section>

            <section className="card flex flex-col gap-2.5 p-5 text-[13px] leading-6" aria-labelledby="payment">
              <h2 id="payment" className="flex items-center gap-2 text-base font-black">
                <CreditCard className="size-5 text-muted" aria-hidden />
                پرداخت
              </h2>
              {invoice.payment.map((row) => (
                <p key={row.label}>
                  <span className="text-muted">{row.label}: </span>
                  <span dir={row.ltr ? "ltr" : undefined}>{row.value}</span>
                </p>
              ))}
            </section>

            <section className="card p-5" aria-label="خلاصه مالی">
              <dl className="flex flex-col gap-3 text-[13px]">
                {invoice.sums.map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{s.label}</dt>
                    <dd className={`whitespace-nowrap font-extrabold ${s.discount ? "text-brand" : ""}`}>{s.value}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 border-t border-dashed border-line pt-3">
                  <dt className="font-extrabold">{invoice.total.label}</dt>
                  <dd className="whitespace-nowrap text-base font-black">{invoice.total.value}</dd>
                </div>
              </dl>
            </section>

            {pending && (
              <p className="flex items-start gap-2 rounded-xl bg-warning-soft p-4 text-xs leading-6 text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                اگر مبلغ از حساب شما کم شده ولی سفارش هنوز «در انتظار پرداخت» است، چند دقیقه صبر کنید یا با پشتیبانی تماس بگیرید؛ بانک مبلغ پرداخت‌نشده را حداکثر تا ۷۲ ساعت برمی‌گرداند.
              </p>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
