import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { faDigits } from "@/lib/format";
import { buildInvoice, invoiceInclude } from "@/lib/invoice";
import { getContact, getShippingConfig } from "@/lib/settings";
import { PageBar } from "@/components/layout/PageBar";
import { InvoiceView } from "@/components/orders/InvoiceView";

export const metadata: Metadata = { title: "فاکتور سفارش" };

export default async function OrderInvoicePage({ params }: PageProps<"/profile/orders/[number]/invoice">) {
  const user = await requireUser("/profile/orders");
  const number = Number((await params).number);
  if (!Number.isSafeInteger(number) || number < 1) notFound();
  // userId in the filter: customers only ever see their own invoices.
  const order = await db.order.findFirst({ where: { number, userId: user.id }, include: invoiceInclude });
  if (!order) notFound();

  const invoice = buildInvoice(order, await getContact(), await getShippingConfig());
  const pdf = `/api/orders/${order.number}/invoice`;

  return (
    <>
      <PageBar
        title={`${invoice.title} سفارش #${faDigits(order.number)}`}
        mobileTitle={invoice.title}
        backHref={`/profile/orders/${order.number}`}
        crumbs={[
          { href: "/profile", label: "حساب کاربری" },
          { href: "/profile/orders", label: "سفارش‌های من" },
          { href: `/profile/orders/${order.number}`, label: `سفارش #${faDigits(order.number)}` },
        ]}
      />
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-6 text-muted">
          {invoice.kind === "proforma"
            ? "این پیش‌فاکتور سفارش شماست. بعد از پرداخت، فاکتور فروش در همین صفحه صادر می‌شود."
            : "فاکتور فروش این سفارش را می‌توانید به‌صورت فایل PDF دریافت یا چاپ کنید."}
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a href={pdf} download={invoice.fileName} className="btn-primary flex-1 px-5 py-2.5 sm:flex-none">
            <Download className="size-4" aria-hidden />
            دانلود PDF
          </a>
          <a href={`${pdf}?view=1`} target="_blank" rel="noopener" className="btn-ghost flex-1 px-5 py-2.5 sm:flex-none">
            <Printer className="size-4" aria-hidden />
            نمایش و چاپ
          </a>
        </div>
      </div>
      <InvoiceView invoice={invoice} />
    </>
  );
}
