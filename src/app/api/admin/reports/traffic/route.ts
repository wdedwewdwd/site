import { requireStaff } from "@/lib/auth/session";
import { jKey, jLong } from "@/lib/jalali";
import { parseReportParams } from "@/lib/reports";
import { trafficReport } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/** Neutralizes spreadsheet formula injection and quotes the cell. */
const cell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

/** CSV export of the visit statistics (UTF-8 with BOM so Excel shows Persian correctly). */
export async function GET(req: Request) {
  await requireStaff(["ADMIN", "SUPPORT"]);
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const { from, to, granularity } = parseReportParams(sp);
  const r = await trafficReport(from, to, granularity);
  const t = r.totals;

  const rows: (string | number)[][] = [
    ["گزارش بازدید آریزون یدک", `${jLong(from)} تا ${jLong(to)}`],
    [],
    ["بازدیدکننده", t.visitors],
    ["ورود به سایت", t.sessions],
    ["بازدید صفحه", t.views],
    ["بازدیدکننده جدید", t.newVisitors],
    ["صفحه در هر ورود", round1(t.pagesPerSession)],
    ["میانگین زمان حضور (ثانیه)", Math.round(t.avgDur / 1000)],
    ["نرخ پرش (درصد)", round1(t.bounceRate)],
    ["سفارش ثبت‌شده", t.orders],
    ["نرخ تبدیل (درصد)", round1(t.conversion)],
    [],
    ["بازه", "بازدیدکننده", "ورود به سایت", "بازدید صفحه"],
    ...r.series.map((s) => [s.fullLabel, s.visitors, s.sessions, s.views]),
    [],
    ["پربازدیدترین صفحه‌ها", "بازدید", "بازدیدکننده", "میانگین زمان (ثانیه)"],
    ...r.pages.map((p) => [p.label, p.views, p.visitors, Math.round(p.avgMs / 1000)]),
    [],
    ["پربازدیدترین محصولات", "بازدید", "بازدیدکننده", "فروش"],
    ...r.products.map((p) => [p.name, p.views, p.visitors, p.sold]),
    [],
    ["منبع ورود", "ورود"],
    ...r.channels.map((c) => [c.label, c.sessions]),
    [],
    ["جستجو", "تعداد", "بازدیدکننده"],
    ...r.searches.map((s) => [s.term, s.views, s.visitors]),
  ];
  const csv = "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="visits-${jKey(from)}_${jKey(to)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
