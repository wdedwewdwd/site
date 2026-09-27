import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Phone, Printer, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { faDateTime, faDigits, toman } from "@/lib/format";
import { ORDER_STATUS, SHIPPING } from "@/lib/shop";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryRow } from "@/components/cart/SummaryRow";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { OrderActions } from "@/components/admin/orders/OrderActions";
import { AdminNoteForm, ShippingEditButton } from "@/components/admin/orders/OrderSideForms";

export const metadata = { title: "جزئیات سفارش" };

const GATEWAY: Record<string, string> = { zarinpal: "زرین‌پال", mock: "درگاه آزمایشی", manual: "تأیید دستی", cod: "پرداخت در محل" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[number]">) {
  await requireStaff(["ADMIN", "SUPPORT"]);
  const number = Number((await params).number);
  if (!Number.isSafeInteger(number) || number < 1) notFound();
  const order = await db.order.findUnique({
    where: { number },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, phone: true, nationalCode: true, createdAt: true } },
      items: { include: { product: { select: { slug: true, stock: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } } } },
      events: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const customerStats = await db.order.aggregate({
    where: { userId: order.user.id, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
    _count: true,
    _sum: { total: true },
  });
  const paid = order.payments.find((p) => p.status === "SUCCEEDED");
  const customerName = [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || "بدون نام";
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      <PageHeader title={`سفارش #${faDigits(order.number)}`} backHref="/admin/orders">
        <StatusBadge status={order.status} />
        <Link href={`/admin/invoice/${order.number}`} target="_blank" className="btn-ghost py-2 text-xs">
          <Printer className="size-4" /> چاپ فاکتور و برچسب
        </Link>
      </PageHeader>
      <HelpBox
        items={[
          "دکمه‌های «اقدام بعدی» فقط کارهای مجاز برای وضعیت فعلی را نشان می‌دهند؛ مسیر معمول: شروع آماده‌سازی ← ثبت ارسال (با روش ارسال و کد رهگیری) ← تحویل شد.",
          "با هر تغییر وضعیت، اگر تیک «اطلاع‌رسانی به مشتری» زده باشد، یک اعلان در حساب مشتری ثبت می‌شود.",
          "لغو یا مرجوعی، موجودی کالاها را به انبار برمی‌گرداند و بازگشایی سفارش، دوباره از موجودی کم می‌کند.",
          "برای سفارش پرداخت در محل، بعد از دریافت پول «ثبت دریافت وجه در محل» را بزنید تا در گزارش‌ها «پرداخت‌شده» حساب شود.",
          "یادداشت داخلی فقط برای مدیران قابل مشاهده است.",
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Summary strip */}
          <section className="card grid grid-cols-2 gap-4 p-5 text-[13px] md:grid-cols-4">
            <div className="flex flex-col gap-1"><span className="text-xs text-muted">زمان ثبت (تهران)</span><b>{faDateTime(order.createdAt)}</b></div>
            <div className="flex flex-col gap-1"><span className="text-xs text-muted">مبلغ کل</span><b>{toman(order.total)} تومان</b></div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">پرداخت</span>
              <b className={paid ? "text-success" : "text-warning"}>
                {order.paymentMethod === "ONLINE" ? "آنلاین" : "در محل"} — {paid ? "پرداخت‌شده" : "پرداخت‌نشده"}
              </b>
            </div>
            <div className="flex flex-col gap-1"><span className="text-xs text-muted">ارسال</span><b>{order.carrier ?? SHIPPING[order.shippingMethod].title.split(" (")[0]}</b></div>
          </section>

          {/* Items */}
          <section className="card overflow-hidden" aria-labelledby="items">
            <h2 id="items" className="p-5 pb-3 text-base font-black">اقلام سفارش ({faDigits(itemCount)} عدد)</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[13px]">
                <thead className="bg-canvas text-muted">
                  <tr>
                    <th className="px-5 py-3 text-right font-bold">کالا</th>
                    <th className="px-3 py-3 text-right font-bold">تعداد</th>
                    <th className="px-3 py-3 text-right font-bold">قیمت واحد</th>
                    <th className="px-5 py-3 text-right font-bold">جمع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-3">
                          <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-surface">
                            {i.product?.images[0] && <Image src={i.product.images[0].url} alt="" fill sizes="44px" className="object-cover" />}
                          </span>
                          <span className="flex flex-col gap-0.5">
                            <b>{i.name}</b>
                            <span className="text-[11px] text-muted" dir="ltr">{i.sku}</span>
                            {i.product && <span className="text-[11px] text-muted">موجودی فعلی انبار: {faDigits(i.product.stock)}</span>}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3 font-bold">{faDigits(i.quantity)}</td>
                      <td className="px-3 py-3">{toman(i.unitPrice)}</td>
                      <td className="px-5 py-3 font-bold">{toman(i.unitPrice * i.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="flex flex-col gap-3 border-t border-line p-5">
              <SummaryRow label="جمع کالاها" value={order.subtotal} />
              {order.discount > 0 && <SummaryRow label={`تخفیف (${order.discountCode})`} value={order.discount} tone="red" />}
              <SummaryRow label={`ارسال — ${SHIPPING[order.shippingMethod].title}`} value={order.shippingCost} />
              <SummaryRow label="مبلغ کل" value={order.total} strong />
            </dl>
          </section>

          {/* Customer + shipping */}
          <div className="grid gap-6 md:grid-cols-2">
            <section className="card flex flex-col gap-3 p-5 text-[13px]" aria-labelledby="customer">
              <h2 id="customer" className="flex items-center gap-2 text-base font-black"><UserRound className="size-5 text-muted" /> مشتری</h2>
              <p className="text-sm font-bold">{customerName}</p>
              <p className="flex flex-wrap items-center gap-3">
                <span dir="ltr">{faDigits(order.user.phone)}</span>
                <a href={`tel:${order.user.phone}`} className="flex items-center gap-1 rounded-lg bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                  <Phone className="size-3.5" /> تماس
                </a>
              </p>
              {order.user.nationalCode && <p>کد ملی: {faDigits(order.user.nationalCode)}</p>}
              <p className="text-muted">
                {faDigits(customerStats._count)} سفارش موفق · مجموع خرید {toman(customerStats._sum.total ?? 0)} تومان
              </p>
              <Link href={`/admin/orders?q=${order.user.phone}`} className="text-xs font-bold text-info hover:underline">همه سفارش‌های این مشتری</Link>
            </section>

            <section className="card flex flex-col gap-3 p-5 text-[13px]" aria-labelledby="ship">
              <div className="flex items-center justify-between">
                <h2 id="ship" className="text-base font-black">ارسال به</h2>
                <ShippingEditButton
                  orderId={order.id}
                  shipping={{ receiverName: order.receiverName, receiverPhone: order.receiverPhone, province: order.province, city: order.city, postalCode: order.postalCode, fullAddress: order.fullAddress }}
                />
              </div>
              <p><b>{order.receiverName}</b> — <span dir="ltr">{faDigits(order.receiverPhone)}</span></p>
              <p className="leading-7">{order.province}، {order.city}، {order.fullAddress}</p>
              {order.postalCode ? (
                <p>کد پستی: {faDigits(order.postalCode)}</p>
              ) : (
                <p className="flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs font-bold text-warning">
                  <AlertTriangle className="size-4 shrink-0" /> کد پستی وارد نشده؛ با گیرنده تماس بگیرید و با «ویرایش» ثبت کنید.
                </p>
              )}
              {(order.carrier || order.trackingCode) && (
                <p className="rounded-lg bg-canvas px-3 py-2">
                  {order.carrier}{order.trackingCode && <> — کد رهگیری: <b dir="ltr">{order.trackingCode}</b></>}
                </p>
              )}
            </section>
          </div>

          {/* Payments */}
          <section className="card flex flex-col gap-3 p-5" aria-labelledby="payments">
            <h2 id="payments" className="text-base font-black">تراکنش‌ها</h2>
            {order.payments.length === 0 ? (
              <p className="text-sm text-muted">{order.paymentMethod === "COD" ? "پرداخت در محل؛ هنوز دریافت وجه ثبت نشده است." : "تراکنشی ثبت نشده است."}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-[13px]">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2.5">
                    <span>{GATEWAY[p.gateway] ?? p.gateway} — {toman(p.amount)} تومان</span>
                    <span className={p.status === "SUCCEEDED" ? "font-bold text-success" : p.status === "FAILED" ? "text-brand" : "text-muted"}>
                      {p.status === "SUCCEEDED" ? `موفق${p.refId ? ` · مرجع ${p.refId}` : ""}` : p.status === "FAILED" ? "ناموفق" : "در انتظار"}
                    </span>
                    <span className="text-muted">{faDateTime(p.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="card flex flex-col gap-3 p-5" aria-labelledby="next">
            <h2 id="next" className="text-base font-black">اقدام بعدی</h2>
            <OrderActions
              orderId={order.id}
              number={faDigits(order.number)}
              status={order.status}
              paymentMethod={order.paymentMethod}
              hasPayment={!!paid}
              total={toman(order.total)}
              carrier={order.carrier}
              trackingCode={order.trackingCode}
            />
          </section>

          <section className="card flex flex-col gap-3 p-5" aria-labelledby="note">
            <h2 id="note" className="text-base font-black">یادداشت داخلی</h2>
            <AdminNoteForm orderId={order.id} note={order.adminNote} />
          </section>

          <section className="card flex flex-col gap-3 p-5" aria-labelledby="history">
            <h2 id="history" className="text-base font-black">تاریخچه</h2>
            <ol className="flex flex-col gap-4 border-r-2 border-line pr-4">
              {order.events.map((e) => (
                <li key={e.id} className="relative text-[13px]">
                  <span className="absolute -right-[23px] top-1 size-3 rounded-full border-2 border-white bg-subtle" aria-hidden />
                  <p className="font-bold">{ORDER_STATUS[e.status].label}</p>
                  {e.note && <p className="leading-6 text-muted">{e.note}</p>}
                  <p className="text-[11px] text-muted">{faDateTime(e.createdAt)}</p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}
