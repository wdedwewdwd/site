import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { buildInvoice, invoiceInclude } from "@/lib/invoice";
import { pdfResponse, renderInvoicePdf } from "@/lib/invoice-pdf";
import { rateLimit } from "@/lib/rate-limit";
import { getContact, getShippingConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** The signed-in customer's invoice for one of their own orders, as a PDF (`?view=1` opens it instead of saving). */
export async function GET(req: Request, ctx: RouteContext<"/api/orders/[number]/invoice">) {
  const raw = (await ctx.params).number;
  const number = /^\d{1,10}$/.test(raw) ? Number(raw) : 0;
  const user = await requireUser(number ? `/profile/orders/${number}` : "/profile/orders");
  if (!Number.isSafeInteger(number) || number < 1) return new Response("سفارش یافت نشد.", { status: 404 });

  const rl = await rateLimit(`invoice:${user.id}`, 40, 600);
  if (!rl.ok) return new Response("درخواست‌ها زیاد است؛ چند دقیقه دیگر دوباره امتحان کنید.", { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });

  // userId in the filter: a customer only ever gets their own invoices.
  const order = await db.order.findFirst({ where: { number, userId: user.id }, include: invoiceInclude });
  if (!order) return new Response("سفارش یافت نشد.", { status: 404 });

  const invoice = buildInvoice(order, await getContact(), await getShippingConfig());
  const pdf = await renderInvoicePdf(invoice);
  return pdfResponse(pdf, invoice.fileName, new URL(req.url).searchParams.get("view") === "1");
}
