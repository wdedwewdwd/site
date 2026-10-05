import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { faDigits } from "@/lib/format";
import { getContact, getShippingConfig } from "@/lib/settings";
import { PrintButton } from "@/components/admin/orders/PrintButton";
import { InvoiceSheet, invoiceInclude } from "@/components/admin/orders/InvoiceSheet";
import { BackButton } from "@/components/layout/BackButton";

export const metadata = { title: "چاپ گروهی فاکتورها", robots: { index: false, follow: false } };

const MAX_ORDERS = 50;

/** Invoices and labels of several orders (?n=12&n=15), one per printed page. */
export default async function BatchInvoicePage({ searchParams }: PageProps<"/admin/invoice/batch">) {
  await requireStaff(["ADMIN", "SUPPORT"]);
  const raw = (await searchParams).n;
  const numbers = [...new Set((Array.isArray(raw) ? raw : [raw]).map(Number))]
    .filter((n) => Number.isSafeInteger(n) && n > 0)
    .slice(0, MAX_ORDERS);
  if (numbers.length === 0) notFound();

  const [orders, contact, shipping] = await Promise.all([
    db.order.findMany({ where: { number: { in: numbers } }, orderBy: { number: "asc" }, include: invoiceInclude }),
    getContact(),
    getShippingConfig(),
  ]);
  if (orders.length === 0) notFound();

  return (
    <main className="min-h-dvh bg-canvas py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 px-4 print:hidden">
        <BackButton fallback="/admin/orders" variant="pill" />
        <p className="text-sm font-bold">{faDigits(orders.length)} فاکتور — هر کدام در یک صفحه چاپ می‌شود</p>
        <PrintButton />
      </div>
      <div className="flex flex-col gap-6 print:gap-0">
        {orders.map((o) => <InvoiceSheet key={o.id} order={o} contact={contact} shipping={shipping} />)}
      </div>
    </main>
  );
}
