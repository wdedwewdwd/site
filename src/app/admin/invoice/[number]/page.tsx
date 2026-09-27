import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { faDateTime, faDigits, toman } from "@/lib/format";
import { SHIPPING, SITE } from "@/lib/shop";
import { LogoMark } from "@/components/brand/Logo";
import { PrintButton } from "@/components/admin/orders/PrintButton";
import { BackButton } from "@/components/layout/BackButton";

export const metadata = { title: "فاکتور سفارش", robots: { index: false, follow: false } };

/** Printable A4 invoice with a cut-out shipping label. */
export default async function InvoicePage({ params }: PageProps<"/admin/invoice/[number]">) {
  await requireStaff(["ADMIN", "SUPPORT"]);
  const number = Number((await params).number);
  if (!Number.isSafeInteger(number) || number < 1) notFound();
  const order = await db.order.findUnique({
    where: { number },
    include: { user: { select: { firstName: true, lastName: true, phone: true, nationalCode: true } }, items: true, payments: { where: { status: "SUCCEEDED" }, take: 1 } },
  });
  if (!order) notFound();

  const buyer = [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || order.receiverName;
  const paid = order.payments.length > 0;
  const codDue = order.paymentMethod === "COD" && !paid;

  return (
    <main className="min-h-dvh bg-canvas py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4 print:hidden">
        <BackButton fallback={`/admin/orders/${order.number}`} variant="pill" />
        <PrintButton />
      </div>

      <article className="mx-auto flex max-w-[210mm] flex-col gap-6 bg-white p-8 text-[12px] leading-6 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-ink pb-4">
          <div className="flex items-center gap-3">
            <LogoMark className="h-12 w-[80px]" />
            <div>
              <p className="text-lg font-black">{SITE.name}</p>
              <p className="text-muted">{SITE.latinName}</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-base font-black">فاکتور فروش</p>
            <p>شماره: {faDigits(order.number)}</p>
            <p>تاریخ: {faDateTime(order.createdAt)}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-line p-3">
            <p className="mb-1 font-black">فروشنده</p>
            <p>{SITE.name}</p>
            <p>نشانی: {SITE.address}</p>
            {SITE.postalCode && <p>کد پستی: {SITE.postalCode}</p>}
            <p>تلفن: <span dir="ltr">{SITE.supportPhone}</span> — <span dir="ltr">{SITE.supportMobile}</span></p>
          </div>
          <div className="rounded-lg border border-line p-3">
            <p className="mb-1 font-black">خریدار</p>
            <p>{buyer} — <span dir="ltr">{faDigits(order.user.phone)}</span></p>
            {order.user.nationalCode && <p>کد ملی: {faDigits(order.user.nationalCode)}</p>}
            <p>{order.province}، {order.city}، {order.fullAddress}</p>
            <p>کد پستی: {order.postalCode ? faDigits(order.postalCode) : "—"}</p>
          </div>
        </section>

        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-surface">
              <th className="border border-line px-2 py-1.5 text-right">ردیف</th>
              <th className="border border-line px-2 py-1.5 text-right">شرح کالا</th>
              <th className="border border-line px-2 py-1.5 text-right">کد کالا</th>
              <th className="border border-line px-2 py-1.5 text-right">تعداد</th>
              <th className="border border-line px-2 py-1.5 text-right">مبلغ واحد (تومان)</th>
              <th className="border border-line px-2 py-1.5 text-right">مبلغ کل (تومان)</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i, idx) => (
              <tr key={i.id}>
                <td className="border border-line px-2 py-1.5">{faDigits(idx + 1)}</td>
                <td className="border border-line px-2 py-1.5">{i.name}</td>
                <td className="border border-line px-2 py-1.5" dir="ltr">{i.sku}</td>
                <td className="border border-line px-2 py-1.5">{faDigits(i.quantity)}</td>
                <td className="border border-line px-2 py-1.5">{toman(i.unitPrice)}</td>
                <td className="border border-line px-2 py-1.5">{toman(i.unitPrice * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={5} className="border border-line px-2 py-1.5 text-left">جمع کالاها</td><td className="border border-line px-2 py-1.5">{toman(order.subtotal)}</td></tr>
            {order.discount > 0 && <tr><td colSpan={5} className="border border-line px-2 py-1.5 text-left">تخفیف</td><td className="border border-line px-2 py-1.5">{toman(order.discount)}−</td></tr>}
            <tr><td colSpan={5} className="border border-line px-2 py-1.5 text-left">هزینه ارسال ({SHIPPING[order.shippingMethod].title})</td><td className="border border-line px-2 py-1.5">{toman(order.shippingCost)}</td></tr>
            <tr className="bg-surface font-black"><td colSpan={5} className="border border-line px-2 py-1.5 text-left">مبلغ قابل پرداخت</td><td className="border border-line px-2 py-1.5">{toman(order.total)}</td></tr>
          </tfoot>
        </table>

        <p>
          روش پرداخت: {order.paymentMethod === "ONLINE" ? "درگاه آنلاین" : "پرداخت در محل"} — وضعیت: {paid ? "پرداخت شده" : "پرداخت نشده"}
          {order.payments[0]?.refId && <> — کد پیگیری: <span dir="ltr">{order.payments[0].refId}</span></>}
        </p>

        {/* Shipping label (cut along the dashed line) */}
        <section className="mt-4 break-inside-avoid border-t-2 border-dashed border-subtle pt-6">
          <div className="grid grid-cols-[1fr_1.4fr] gap-4 rounded-xl border-2 border-ink p-4 text-[13px]">
            <div className="flex flex-col gap-1 border-l border-line pl-4">
              <p className="font-black">فرستنده</p>
              <p>{SITE.name}</p>
              <p>{SITE.address}</p>
              {SITE.postalCode && <p>کد پستی: {SITE.postalCode}</p>}
              <p>تلفن: <span dir="ltr">{SITE.supportPhone}</span> — <span dir="ltr">{SITE.supportMobile}</span></p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-black">گیرنده</p>
              <p className="text-base font-black">{order.receiverName}</p>
              <p className="text-[15px] leading-7">{order.province}، {order.city}، {order.fullAddress}</p>
              <p className="text-base font-black">کد پستی: {order.postalCode ? faDigits(order.postalCode) : "__________"}</p>
              <p className="text-base font-black" dir="ltr">{faDigits(order.receiverPhone)}</p>
              <p>سفارش #{faDigits(order.number)}{order.carrier && <> — {order.carrier}</>}</p>
              {codDue && <p className="mt-1 rounded-md bg-ink px-2 py-1 text-center font-black text-white">مبلغ قابل دریافت در محل: {toman(order.total)} تومان</p>}
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}
