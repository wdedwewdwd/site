import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { faDateTime, faDigits, toman } from "@/lib/format";
import { ORDER_STATUS, SHIPPING } from "@/lib/shop";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryRow } from "@/components/cart/SummaryRow";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { OrderUpdateForm } from "@/components/admin/OrderUpdateForm";
import type { OrderStatus } from "@/generated/prisma/client";

export const metadata = { title: "جزئیات سفارش" };

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[number]">) {
  await requireStaff(["ADMIN", "SUPPORT"]);
  const number = Number((await params).number);
  if (!Number.isSafeInteger(number) || number < 1) notFound();
  const order = await db.order.findUnique({
    where: { number },
    include: {
      user: { select: { firstName: true, lastName: true, phone: true, nationalCode: true } },
      items: true,
      events: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  return (
    <>
      <PageHeader title={`سفارش #${faDigits(order.number)}`} backHref="/admin/orders">
        <StatusBadge status={order.status} />
      </PageHeader>
      <HelpBox
        items={[
          "بعد از بسته‌بندی، وضعیت را «در حال آماده‌سازی» کنید. هنگام تحویل به پست یا پیک، «در حال ارسال» را انتخاب و کد رهگیری مرسوله را وارد کنید.",
          "با هر تغییر وضعیت، یک اعلان برای مشتری در حساب کاربری‌اش ثبت می‌شود.",
          "لغو یا مرجوع کردن سفارش، موجودی کالاها را خودکار به انبار برمی‌گرداند. بازگرداندن پول پرداخت آنلاین باید از پنل درگاه پرداخت انجام شود.",
          "فقط تغییرهای مجاز نمایش داده می‌شوند (مثلاً سفارش تحویل‌شده را نمی‌توان به «در حال ارسال» برگرداند).",
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <section className="card overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead className="bg-canvas text-muted">
                <tr>
                  <th className="px-4 py-3 text-right font-bold">کالا</th>
                  <th className="px-4 py-3 text-right font-bold">کد</th>
                  <th className="px-4 py-3 text-right font-bold">تعداد</th>
                  <th className="px-4 py-3 text-right font-bold">قیمت واحد</th>
                  <th className="px-4 py-3 text-right font-bold">جمع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-3 font-bold">{i.name}</td>
                    <td className="px-4 py-3" dir="ltr">{i.sku}</td>
                    <td className="px-4 py-3">{faDigits(i.quantity)}</td>
                    <td className="px-4 py-3">{toman(i.unitPrice)}</td>
                    <td className="px-4 py-3 font-bold">{toman(i.unitPrice * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="flex flex-col gap-3 border-t border-line p-5">
              <SummaryRow label="جمع کالاها" value={order.subtotal} />
              {order.discount > 0 && <SummaryRow label={`تخفیف (${order.discountCode})`} value={order.discount} tone="red" />}
              <SummaryRow label={`ارسال — ${SHIPPING[order.shippingMethod].title}`} value={order.shippingCost} />
              <SummaryRow label="مبلغ کل" value={order.total} strong />
            </dl>
          </section>

          <section className="card grid gap-4 p-5 text-[13px] md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h2 className="text-base font-black">مشتری</h2>
              <p>{[order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || "—"}</p>
              <p dir="ltr" className="text-right">{faDigits(order.user.phone)}</p>
              {order.user.nationalCode && <p>کد ملی: {faDigits(order.user.nationalCode)}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-base font-black">ارسال به</h2>
              <p>{order.receiverName} — <span dir="ltr">{faDigits(order.receiverPhone)}</span></p>
              <p className="leading-7">{order.province}، {order.city}، {order.fullAddress}</p>
              {order.postalCode ? (
                <p>کد پستی: {faDigits(order.postalCode)}</p>
              ) : (
                <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs font-bold text-warning">کد پستی وارد نشده؛ قبل از ارسال با گیرنده تماس بگیرید.</p>
              )}
            </div>
          </section>

          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-base font-black">پرداخت‌ها</h2>
            {order.payments.length === 0 ? (
              <p className="text-sm text-muted">{order.paymentMethod === "COD" ? "پرداخت در محل" : "بدون تراکنش"}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-[13px]">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-canvas px-3 py-2">
                    <span>{p.gateway} — {toman(p.amount)} تومان</span>
                    <span className={p.status === "SUCCEEDED" ? "font-bold text-success" : p.status === "FAILED" ? "text-brand" : "text-muted"}>
                      {p.status === "SUCCEEDED" ? `موفق (${p.refId})` : p.status === "FAILED" ? "ناموفق" : "در انتظار"}
                    </span>
                    <span className="text-muted">{faDateTime(p.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="card p-5">
            <h2 className="mb-4 text-base font-black">به‌روزرسانی سفارش</h2>
            <OrderUpdateForm orderId={order.id} status={order.status} trackingCode={order.trackingCode} next={NEXT[order.status]} />
          </section>
          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-base font-black">تاریخچه</h2>
            <ol className="flex flex-col gap-3 border-r-2 border-line pr-4">
              {order.events.map((e) => (
                <li key={e.id} className="text-[13px]">
                  <p className="font-bold">{ORDER_STATUS[e.status].label}</p>
                  {e.note && <p className="text-muted">{e.note}</p>}
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
