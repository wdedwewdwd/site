import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, CircleX, Download, FileText } from "lucide-react";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth/session";
import { faDigits, toman } from "@/lib/format";
import { invoiceTitle } from "@/lib/invoice";
import { getShippingConfig } from "@/lib/settings";
import { PayAgainButton } from "@/components/checkout/PayAgainButton";
import { PageBar } from "@/components/layout/PageBar";

export const metadata: Metadata = { title: "نتیجه سفارش", robots: { index: false } };

export default async function OrderResultPage({ params, searchParams }: PageProps<"/checkout/result/[number]">) {
  const number = Number((await params).number);
  if (!Number.isSafeInteger(number) || number < 1) notFound();
  const failedParam = (await searchParams).status === "failed";

  // Only the owner sees order details; anyone else (or a lost session) sees a generic message.
  const user = await getUser();
  const order = user
    ? await db.order.findFirst({
        where: { number, userId: user.id },
        include: { payments: { where: { status: "SUCCEEDED" }, take: 1 } },
      })
    : null;

  const shipping = await getShippingConfig();
  const success = order ? order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED" : !failedParam;

  return (
    <div className="container-page flex flex-col gap-6 py-6 md:py-10">
      <PageBar title="نتیجه سفارش" backHref="/" forceBack />
      <div className="card mx-auto flex max-w-xl flex-col items-center gap-5 px-6 py-10 text-center">
        {success ? (
          <span className="grid size-20 place-items-center rounded-full bg-success-soft text-success"><CircleCheck className="size-10" /></span>
        ) : (
          <span className="grid size-20 place-items-center rounded-full bg-brand-soft text-brand"><CircleX className="size-10" /></span>
        )}
        <h1 className="text-xl font-black">
          {success ? (order?.paymentMethod === "COD" ? "سفارش شما با موفقیت ثبت شد" : "پرداخت با موفقیت انجام شد") : "پرداخت ناموفق بود"}
        </h1>
        <p className="text-sm leading-7 text-muted">
          {success
            ? `سفارش شما با موفقیت ثبت شد و در مرحله آماده‌سازی ارسال قرار دارد.${order ? " فاکتور خرید شما صادر شد؛ می‌توانید آن را ببینید یا فایل PDF آن را دریافت کنید." : ""}`
            : "پرداخت انجام نشد. اگر مبلغی از حساب شما کسر شده باشد، حداکثر تا ۷۲ ساعت آینده توسط بانک بازگردانده می‌شود."}
        </p>

        {order && (
          <dl className="grid w-full gap-3 rounded-xl bg-canvas p-4 text-sm sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted">شماره سفارش</dt>
              <dd className="font-black">#{faDigits(order.number)}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted">مبلغ</dt>
              <dd className="font-black">{toman(order.total)} تومان</dd>
            </div>
            {order.payments[0]?.refId && (
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted">کد پیگیری پرداخت</dt>
                <dd className="font-black" dir="ltr">{faDigits(order.payments[0].refId)}</dd>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted">روش تحویل انتخابی</dt>
              <dd className="font-bold">{shipping.methods[order.shippingMethod].title}</dd>
            </div>
          </dl>
        )}

        {success && order && (
          <div className="flex w-full flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-3 text-right">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <FileText className="size-5" aria-hidden />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-black">{invoiceTitle(order)} شماره {faDigits(order.number)}</span>
                <span className="text-xs text-muted">فایل PDF قابل چاپ و ذخیره</span>
              </span>
            </span>
            <span className="grid grid-cols-2 gap-2">
              <Link href={`/profile/orders/${order.number}/invoice`} className="btn-ghost px-4 py-2.5 text-xs">مشاهده فاکتور</Link>
              <a href={`/api/orders/${order.number}/invoice`} download className="btn-ghost px-4 py-2.5 text-xs">
                <Download className="size-4" aria-hidden />
                دانلود PDF
              </a>
            </span>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          {!success && order?.status === "PENDING_PAYMENT" && <PayAgainButton orderId={order.id} />}
          <Link href={order ? `/profile/orders/${order.number}` : "/profile/orders"} className={success ? "btn-primary" : "btn-ghost"}>
            پیگیری و مشاهده سفارش
          </Link>
          <Link href="/" className="btn-ghost">بازگشت به صفحه اصلی</Link>
        </div>
      </div>
    </div>
  );
}
