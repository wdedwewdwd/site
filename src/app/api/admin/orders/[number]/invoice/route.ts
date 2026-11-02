import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { buildInvoice, invoiceInclude } from "@/lib/invoice";
import { pdfResponse, renderInvoicePdf } from "@/lib/invoice-pdf";
import { rateLimit } from "@/lib/rate-limit";
import { getContact, getShippingConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Any order's customer invoice as a PDF, the same file the customer downloads (`?view=1` opens it instead). */
export async function GET(req: Request, ctx: RouteContext<"/api/admin/orders/[number]/invoice">) {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  const raw = (await ctx.params).number;
  const number = /^\d{1,10}$/.test(raw) ? Number(raw) : 0;
  if (!Number.isSafeInteger(number) || number < 1) return new Response("سفارش یافت نشد.", { status: 404 });

  const rl = await rateLimit(`admin-invoice:${staff.id}`, 120, 600);
  if (!rl.ok) return new Response("درخواست‌ها زیاد است؛ چند دقیقه دیگر دوباره امتحان کنید.", { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });

  const order = await db.order.findUnique({ where: { number }, include: invoiceInclude });
  if (!order) return new Response("سفارش یافت نشد.", { status: 404 });

  const invoice = buildInvoice(order, await getContact(), await getShippingConfig());
  const pdf = await renderInvoicePdf(invoice);
  return pdfResponse(pdf, invoice.fileName, new URL(req.url).searchParams.get("view") === "1");
}
