import Link from "next/link";
import { Boxes, Headset, ShoppingBag, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { expireStaleOrders, housekeeping } from "@/lib/orders";
import { faDate, faDigits, toman } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/admin/PageHeader";

const DAY = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

async function loadDashboard() {
  const since30 = new Date(Date.now() - 30 * DAY);
  const since7 = new Date(new Date().setHours(0, 0, 0, 0) - 6 * DAY);
  const paidStatuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

  const [orderCount, revenue30, activeProducts, openTickets, lowStock, recent, week] = await Promise.all([
    db.order.count({ where: { status: { in: [...paidStatuses] } } }),
    db.order.aggregate({ where: { status: { in: [...paidStatuses] }, createdAt: { gte: since30 } }, _sum: { total: true } }),
    db.product.count({ where: { isActive: true } }),
    db.ticket.count({ where: { status: "OPEN" } }),
    db.product.findMany({ where: { isActive: true, stock: { lte: 5 } }, orderBy: { stock: "asc" }, take: 5, select: { id: true, name: true, stock: true } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { firstName: true, lastName: true, phone: true } } } }),
    db.order.findMany({ where: { status: { in: [...paidStatuses] }, createdAt: { gte: since7 } }, select: { total: true, createdAt: true } }),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(since7.getTime() + i * DAY);
    const total = week.filter((o) => o.createdAt >= start && o.createdAt < new Date(start.getTime() + DAY)).reduce((s, o) => s + o.total, 0);
    return { label: WEEKDAYS[start.getDay()], total };
  });
  const max = Math.max(1, ...days.map((d) => d.total));

  return { orderCount, revenue30, activeProducts, openTickets, lowStock, recent, days, max };
}

export default async function AdminDashboard() {
  await requireStaff(["ADMIN", "SUPPORT"]);
  await Promise.all([expireStaleOrders(), housekeeping()]);
  const { orderCount, revenue30, activeProducts, openTickets, lowStock, recent, days, max } = await loadDashboard();

  const stats = [
    { label: "کل سفارش‌ها", value: `${faDigits(orderCount)} سفارش`, Icon: ShoppingBag, cls: "bg-info-soft text-info" },
    { label: "درآمد ۳۰ روز اخیر", value: `${toman(revenue30._sum.total ?? 0)} تومان`, Icon: Wallet, cls: "bg-brand-soft text-brand" },
    { label: "محصولات فعال", value: `${faDigits(activeProducts)} قطعه`, Icon: Boxes, cls: "bg-warning-soft text-warning" },
    { label: "تیکت‌های باز", value: `${faDigits(openTickets)} تیکت`, Icon: Headset, cls: "bg-success-soft text-success" },
  ];

  return (
    <>
      <PageHeader title="داشبورد مدیریتی" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, Icon, cls }) => (
          <div key={label} className="card flex flex-col gap-4 p-5">
            <div className="flex items-center gap-3">
              <span className={`grid size-9 place-items-center rounded-lg ${cls}`}><Icon className="size-5" /></span>
              <span className="text-sm text-muted">{label}</span>
            </div>
            <span className="text-xl font-black">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="card p-5" aria-labelledby="chart">
          <h2 id="chart" className="mb-6 text-base font-black">نمودار درآمد ۷ روز اخیر</h2>
          <div className="flex h-48 items-end justify-between gap-3" role="img" aria-label="نمودار ستونی درآمد روزانه">
            {days.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] text-muted">{d.total ? toman(Math.round(d.total / 1000)) + "k" : ""}</span>
                <div className="w-full max-w-12 rounded-t-lg bg-brand" style={{ height: `${Math.max(4, (d.total / max) * 150)}px` }} title={`${toman(d.total)} تومان`} />
                <span className="text-[11px] text-muted">{d.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card flex flex-col gap-3 p-5" aria-labelledby="low">
          <h2 id="low" className="text-base font-black">هشدار موجودی کم</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted">همه محصولات موجودی کافی دارند.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lowStock.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-canvas px-3 py-2.5 text-[13px] hover:bg-surface">
                    <span className="line-clamp-1">{p.name}</span>
                    <span className={`shrink-0 font-black ${p.stock === 0 ? "text-brand" : "text-warning"}`}>{faDigits(p.stock)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/discounts" className="mt-auto rounded-lg bg-brand-soft px-4 py-3 text-sm font-bold text-brand hover:bg-brand/15">تعریف کوپن تخفیف جدید</Link>
        </section>
      </div>

      <section className="card mt-6 overflow-hidden" aria-labelledby="recent">
        <h2 id="recent" className="p-5 text-base font-black">آخرین سفارش‌های ثبت شده</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead className="bg-canvas text-muted">
              <tr>
                <th className="px-5 py-3 text-right font-bold">شماره سفارش</th>
                <th className="px-5 py-3 text-right font-bold">مشتری</th>
                <th className="px-5 py-3 text-right font-bold">مبلغ سفارش</th>
                <th className="px-5 py-3 text-right font-bold">وضعیت</th>
                <th className="px-5 py-3 text-right font-bold">تاریخ ثبت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recent.map((o) => (
                <tr key={o.id} className="hover:bg-canvas">
                  <td className="px-5 py-3 font-black"><Link href={`/admin/orders/${o.number}`} className="hover:text-brand">#{faDigits(o.number)}</Link></td>
                  <td className="px-5 py-3">{[o.user.firstName, o.user.lastName].filter(Boolean).join(" ") || faDigits(o.user.phone)}</td>
                  <td className="px-5 py-3 font-bold text-brand">{toman(o.total)} تومان</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3 text-muted">{faDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
