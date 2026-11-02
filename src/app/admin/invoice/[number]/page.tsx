import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { getContact, getShippingConfig } from "@/lib/settings";
import { PrintButton } from "@/components/admin/orders/PrintButton";
import { InvoiceSheet, invoiceInclude } from "@/components/admin/orders/InvoiceSheet";
import { BackButton } from "@/components/layout/BackButton";

export const metadata = { title: "فاکتور سفارش", robots: { index: false, follow: false } };

/** Printable A4 invoice with a cut-out shipping label. */
export default async function InvoicePage({ params }: PageProps<"/admin/invoice/[number]">) {
  await requireStaff(["ADMIN", "SUPPORT"]);
  const number = Number((await params).number);
  if (!Number.isSafeInteger(number) || number < 1) notFound();
  const order = await db.order.findUnique({ where: { number }, include: invoiceInclude });
  if (!order) notFound();
  const contact = await getContact();

  return (
    <main className="min-h-dvh bg-canvas py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4 print:hidden">
        <BackButton fallback={`/admin/orders/${order.number}`} variant="pill" />
        <div className="flex gap-2">
          <a href={`/api/admin/orders/${order.number}/invoice`} download className="btn-ghost py-2.5">
            <Download className="size-4" /> فاکتور مشتری (PDF)
          </a>
          <PrintButton />
        </div>
      </div>
      <InvoiceSheet order={order} contact={contact} shipping={await getShippingConfig()} />
    </main>
  );
}
