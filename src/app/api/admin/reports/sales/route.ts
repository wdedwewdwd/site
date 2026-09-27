import { requireStaff } from "@/lib/auth/session";
import { jKey, jLong } from "@/lib/jalali";
import { parseReportParams, salesReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

/** Neutralizes spreadsheet formula injection and quotes the cell. */
const cell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** CSV export of the sales report (UTF-8 with BOM so Excel shows Persian correctly). */
export async function GET(req: Request) {
  await requireStaff(["ADMIN", "SUPPORT"]);
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const { from, to, granularity } = parseReportParams(sp);
  const r = await salesReport(from, to, granularity);

  const rows: (string | number)[][] = [
    ["گزارش فروش آریزون یدک", `${jLong(from)} تا ${jLong(to)}`],
    [],
    ["مبلغ کل فروش (تومان)", r.totals.revenue],
    ["تعداد سفارش", r.totals.orders],
    ["میانگین هر سفارش (تومان)", r.totals.avg],
    ["قطعه فروخته‌شده", r.totals.items],
    ["تخفیف (تومان)", r.totals.discount],
    ["هزینه ارسال دریافتی (تومان)", r.totals.shipping],
    ["مشتری جدید", r.totals.newCustomers],
    ["لغو یا مرجوع", r.totals.cancelled],
    [],
    ["بازه", "تعداد سفارش", "قطعه", "مبلغ فروش (تومان)"],
    ...r.series.map((s) => [s.fullLabel, s.orders, s.items, s.revenue]),
    [],
    ["پرفروش‌ترین قطعات", "تعداد", "مبلغ (تومان)"],
    ...r.topProducts.map((p) => [p.name, p.quantity, p.revenue]),
  ];
  const csv = "\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-${jKey(from)}_${jKey(to)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
