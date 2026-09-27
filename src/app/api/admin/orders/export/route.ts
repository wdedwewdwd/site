import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { orderWhere, parseOrderFilters } from "@/lib/admin-orders";
import { jNumeric, tehranJDate, tehranParts } from "@/lib/jalali";
import { ORDER_STATUS, SHIPPING } from "@/lib/shop";

export const dynamic = "force-dynamic";

/** Neutralizes spreadsheet formula injection and quotes the cell. */
const cell = (v: string | number | null | undefined) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** CSV of the filtered order list (UTF-8 BOM for Excel). */
export async function GET(req: Request) {
  await requireStaff(["ADMIN", "SUPPORT"]);
  const f = parseOrderFilters(Object.fromEntries(new URL(req.url).searchParams));
  const orders = await db.order.findMany({
    where: orderWhere(f),
    orderBy: { createdAt: "desc" },
    take: 20_000,
    include: { user: { select: { firstName: true, lastName: true, phone: true } }, items: { select: { name: true, quantity: true } }, payments: { where: { status: "SUCCEEDED" }, take: 1 } },
  });

  const header = ["شماره", "تاریخ", "ساعت", "مشتری", "موبایل", "گیرنده", "موبایل گیرنده", "استان", "شهر", "نشانی", "کد پستی", "اقلام", "جمع کالاها", "تخفیف", "هزینه ارسال", "مبلغ کل", "روش پرداخت", "وضعیت پرداخت", "روش ارسال", "شرکت حمل", "کد رهگیری", "وضعیت"];
  const rows = orders.map((o) => {
    const t = tehranParts(o.createdAt);
    return [
      o.number,
      jNumeric(tehranJDate(o.createdAt)),
      `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`,
      [o.user.firstName, o.user.lastName].filter(Boolean).join(" "),
      o.user.phone,
      o.receiverName,
      o.receiverPhone,
      o.province,
      o.city,
      o.fullAddress,
      o.postalCode,
      o.items.map((i) => `${i.name} ×${i.quantity}`).join(" / "),
      o.subtotal,
      o.discount,
      o.shippingCost,
      o.total,
      o.paymentMethod === "ONLINE" ? "آنلاین" : "در محل",
      o.payments.length ? "پرداخت‌شده" : "پرداخت‌نشده",
      SHIPPING[o.shippingMethod].title,
      o.carrier,
      o.trackingCode,
      ORDER_STATUS[o.status].label,
    ];
  });
  const csv = "\uFEFF" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const stamp = jNumeric(tehranJDate(new Date())).replace(/\//g, "-");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders.csv"; filename*=UTF-8''${encodeURIComponent(`orders-${stamp}.csv`)}`,
      "Cache-Control": "no-store",
    },
  });
}
