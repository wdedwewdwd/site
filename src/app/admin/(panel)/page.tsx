import Link from "next/link";
import { AlertTriangle, Boxes, Clock3, Headset } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { expireStaleOrders, housekeeping } from "@/lib/orders";
import { faDateTime, faDigits, toman } from "@/lib/format";
import { jFull, tehranParts, tehranToday } from "@/lib/jalali";
import { PRESETS, parseReportParams, salesReport } from "@/lib/reports";
import { SHIPPING } from "@/lib/shop";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { ReportShell } from "@/components/admin/reports/ReportShell";
import { SalesPanel } from "@/components/admin/reports/SalesPanel";
import { HourPanel } from "@/components/admin/reports/HourPanel";
import { BarList, num, StatTile } from "@/components/admin/reports/ReportBlocks";
import { compactNumber } from "@/components/admin/reports/format";

const GRANULARITY_LABEL = { day: "روزانه", week: "هفتگی", month: "ماهانه" } as const;

async function loadOperations() {
  const [activeProducts, openTickets, awaiting, lowStock, recent] = await Promise.all([
    db.product.count({ where: { isActive: true } }),
    db.ticket.count({ where: { status: "OPEN" } }),
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
    db.product.findMany({ where: { isActive: true, stock: { lte: 5 } }, orderBy: { stock: "asc" }, take: 6, select: { id: true, name: true, stock: true } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { firstName: true, lastName: true, phone: true } } } }),
  ]);
  return { activeProducts, openTickets, awaiting, lowStock, recent };
}

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  await requireStaff(["ADMIN", "SUPPORT"]);
  await Promise.all([expireStaleOrders(), housekeeping()]);

  const { from, to, granularity, preset } = parseReportParams(await searchParams);
  const [report, ops] = await Promise.all([salesReport(from, to, granularity), loadOperations()]);
  const now = tehranParts(new Date());
  const today = tehranToday();
  const { totals, previous } = report;

  return (
    <>
      <PageHeader title="داشبورد مدیریتی">
        <span className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-muted ring-1 ring-line">
          <Clock3 className="size-4" aria-hidden />
          {jFull(today)} · ساعت {faDigits(`${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}`)} (تهران)
        </span>
      </PageHeader>
      <HelpBox
        items={[
          "بازه گزارش را از دکمه تقویم انتخاب کنید: بازه‌های آماده (امروز، ۷ روز، این ماه، ماه گذشته و ...) یا روز شروع و پایان دلخواه، مثلاً ۱ مهر تا ۱ آبان. همه تاریخ‌ها شمسی و به وقت تهران است.",
          "«روزانه / هفتگی / ماهانه» تفکیک نمودار را عوض می‌کند. هفته‌ها از شنبه شروع می‌شوند.",
          "درصد زیر هر عدد، مقایسه با دوره قبلی هم‌طول است (مثلاً ۳۰ روز قبل از بازه انتخابی). سبز یعنی بهتر، قرمز یعنی بدتر.",
          "با بردن ماوس روی ستون‌های نمودار جزئیات آن روز را ببینید. «نمایش جدول داده‌ها» همه اعداد را نشان می‌دهد و «خروجی اکسل» فایل گزارش را دانلود می‌کند.",
          "در گزارش فروش فقط سفارش‌های پرداخت‌شده یا تأییدشده (پرداخت در محل) حساب می‌شوند؛ سفارش‌های لغوشده جداگانه نمایش داده می‌شوند.",
        ]}
      />

      <ReportShell from={from} to={to} today={today} granularity={granularity} preset={preset} presets={PRESETS}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="مبلغ کل فروش" value={compactNumber(totals.revenue)} unit="تومان" current={totals.revenue} previous={previous.revenue} />
          <StatTile label="تعداد سفارش" value={num(totals.orders)} current={totals.orders} previous={previous.orders} />
          <StatTile label="میانگین هر سفارش" value={compactNumber(totals.avg)} unit="تومان" current={totals.avg} previous={previous.avg} />
          <StatTile label="قطعه فروخته‌شده" value={num(totals.items)} unit="عدد" current={totals.items} previous={previous.items} />
          <StatTile label="تخفیف داده‌شده (کد تخفیف)" value={compactNumber(totals.discount)} unit="تومان" />
          <StatTile label="هزینه ارسال دریافتی" value={compactNumber(totals.shipping)} unit="تومان" />
          <StatTile label="مشتری جدید" value={num(totals.newCustomers)} unit="نفر" />
          <StatTile
            label="لغو یا مرجوع"
            value={num(totals.cancelled)}
            unit="سفارش"
            hint={totals.pending ? `${num(totals.pending)} سفارش در انتظار پرداخت` : undefined}
          />
        </div>

        <SalesPanel series={report.series} granularityLabel={GRANULARITY_LABEL[granularity]} />

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="card flex flex-col gap-3 p-5" aria-labelledby="top-products">
            <h2 id="top-products" className="text-base font-black">پرفروش‌ترین قطعات این بازه</h2>
            {report.topProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">فروشی ثبت نشده است.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-[13px]">
                  <thead className="text-muted">
                    <tr className="border-b border-line">
                      <th className="py-2 text-right font-bold">#</th>
                      <th className="py-2 text-right font-bold">قطعه</th>
                      <th className="py-2 text-right font-bold">تعداد</th>
                      <th className="py-2 text-right font-bold">مبلغ (تومان)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {report.topProducts.map((p, i) => (
                      <tr key={p.id}>
                        <td className="py-2.5 text-muted">{num(i + 1)}</td>
                        <td className="py-2.5 font-bold">
                          {p.id.startsWith("deleted:") ? p.name : <Link href={`/admin/products/${p.id}`} className="hover:text-brand">{p.name}</Link>}
                        </td>
                        <td className="py-2.5">{num(p.quantity)}</td>
                        <td className="py-2.5 font-bold">{toman(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <HourPanel hours={report.hours} weekdays={report.weekdays} />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <BarList
            title="روش پرداخت"
            rows={report.payment.map((p) => ({ key: p.key, label: p.key === "ONLINE" ? "درگاه آنلاین" : "پرداخت در محل", value: p.revenue, secondary: `${num(p.orders)} سفارش` }))}
          />
          <BarList
            title="روش ارسال"
            rows={report.shipping.map((s) => ({ key: s.key, label: SHIPPING[s.key].title, value: s.revenue, secondary: `${num(s.orders)} سفارش` }))}
          />
          <BarList
            title="استان‌های پرخرید"
            rows={report.provinces.map((p) => ({ key: p.key, label: p.key, value: p.revenue, secondary: `${num(p.orders)} سفارش` }))}
          />
        </div>

        {report.statuses.length > 0 && (
          <section className="card flex flex-col gap-3 p-5" aria-labelledby="statuses">
            <h2 id="statuses" className="text-base font-black">همه سفارش‌های ثبت‌شده در این بازه بر اساس وضعیت</h2>
            <ul className="flex flex-wrap gap-2">
              {report.statuses.map((s) => (
                <li key={s.status}>
                  <Link href={`/admin/orders?status=${s.status}`} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs hover:bg-canvas">
                    <StatusBadge status={s.status} />
                    <b>{num(s.orders)}</b>
                    <span className="text-muted">({compactNumber(s.total)} تومان)</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted">برای مشاهده فهرست سفارش‌های هر وضعیت روی آن بزنید.</p>
          </section>
        )}
      </ReportShell>

      {/* Operations (not scoped by the date range) */}
      <h2 className="mb-4 mt-10 text-lg font-black">وضعیت فعلی فروشگاه</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/orders?status=PAID" className="card flex items-center gap-4 p-4 hover:border-brand">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand"><AlertTriangle className="size-5" /></span>
          <span className="flex flex-col"><span className="text-xs text-muted">منتظر آماده‌سازی / ارسال</span><b className="text-lg">{num(ops.awaiting)} سفارش</b></span>
        </Link>
        <Link href="/admin/tickets" className="card flex items-center gap-4 p-4 hover:border-brand">
          <span className="grid size-11 place-items-center rounded-xl bg-success-soft text-success"><Headset className="size-5" /></span>
          <span className="flex flex-col"><span className="text-xs text-muted">تیکت‌های باز</span><b className="text-lg">{num(ops.openTickets)} تیکت</b></span>
        </Link>
        <Link href="/admin/products" className="card flex items-center gap-4 p-4 hover:border-brand">
          <span className="grid size-11 place-items-center rounded-xl bg-warning-soft text-warning"><Boxes className="size-5" /></span>
          <span className="flex flex-col"><span className="text-xs text-muted">محصولات فعال</span><b className="text-lg">{num(ops.activeProducts)} قطعه</b></span>
        </Link>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
        <section className="card overflow-hidden" aria-labelledby="recent">
          <div className="flex items-center justify-between p-5">
            <h2 id="recent" className="text-base font-black">آخرین سفارش‌ها</h2>
            <Link href="/admin/orders" className="text-xs font-bold text-brand hover:underline">همه سفارش‌ها</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead className="bg-canvas text-muted">
                <tr>
                  <th className="px-5 py-3 text-right font-bold">شماره</th>
                  <th className="px-5 py-3 text-right font-bold">مشتری</th>
                  <th className="px-5 py-3 text-right font-bold">مبلغ</th>
                  <th className="px-5 py-3 text-right font-bold">وضعیت</th>
                  <th className="px-5 py-3 text-right font-bold">زمان ثبت (تهران)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ops.recent.map((o) => (
                  <tr key={o.id} className="hover:bg-canvas">
                    <td className="px-5 py-3 font-black"><Link href={`/admin/orders/${o.number}`} className="hover:text-brand">#{faDigits(o.number)}</Link></td>
                    <td className="px-5 py-3">{[o.user.firstName, o.user.lastName].filter(Boolean).join(" ") || faDigits(o.user.phone)}</td>
                    <td className="px-5 py-3 font-bold">{toman(o.total)} تومان</td>
                    <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3 text-muted">{faDateTime(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card flex flex-col gap-3 p-5" aria-labelledby="low">
          <h2 id="low" className="text-base font-black">هشدار موجودی کم</h2>
          {ops.lowStock.length === 0 ? (
            <p className="text-sm text-muted">همه محصولات موجودی کافی دارند.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ops.lowStock.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-canvas px-3 py-2.5 text-[13px] hover:bg-surface">
                    <span className="line-clamp-1">{p.name}</span>
                    <span className={`shrink-0 font-black ${p.stock === 0 ? "text-brand" : "text-warning"}`}>{p.stock === 0 ? "تمام شد" : `${faDigits(p.stock)} عدد`}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
