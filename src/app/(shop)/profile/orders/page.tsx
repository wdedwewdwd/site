import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { faDate, faDigits, toman } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";

const TABS: { key: string; label: string; statuses?: OrderStatus[] }[] = [
  { key: "all", label: "همه" },
  { key: "pending", label: "در انتظار پرداخت", statuses: ["PENDING_PAYMENT"] },
  { key: "active", label: "در حال پردازش و ارسال", statuses: ["PAID", "PROCESSING", "SHIPPED"] },
  { key: "delivered", label: "تحویل شده", statuses: ["DELIVERED"] },
  { key: "returned", label: "لغو و مرجوعی", statuses: ["CANCELLED", "REFUNDED"] },
];

export default async function OrdersPage({ searchParams }: PageProps<"/profile/orders">) {
  const user = await requireUser("/profile/orders");
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0];

  const where: Prisma.OrderWhereInput = { userId: user.id, ...(tab.statuses ? { status: { in: tab.statuses } } : {}) };
  const [orders, counts] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, include: { _count: { select: { items: true } } } }),
    db.order.groupBy({ by: ["status"], where: { userId: user.id }, _count: true }),
  ]);
  const countFor = (t: (typeof TABS)[number]) =>
    counts.filter((c) => !t.statuses || t.statuses.includes(c.status)).reduce((s, c) => s + c._count, 0);

  return (
    <div className="card flex flex-col gap-5 p-5">
      <h1 className="text-lg font-black">تاریخچه سفارش‌ها</h1>
      <nav aria-label="فیلتر وضعیت" className="-mx-5 overflow-x-auto border-b border-line px-5">
        <ul className="flex gap-6 text-sm">
          {TABS.map((t) => (
            <li key={t.key}>
              <Link
                href={t.key === "all" ? "/profile/orders" : `/profile/orders?tab=${t.key}`}
                aria-current={t.key === tab.key ? "page" : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-3 ${
                  t.key === tab.key ? "border-brand font-extrabold text-brand" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {t.label}
                <span className="rounded-full bg-surface px-1.5 text-[11px]">{faDigits(countFor(t))}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {orders.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">سفارشی در این بخش وجود ندارد.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line p-4">
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-3">
                  <span className="text-sm font-black">سفارش #{faDigits(o.number)}</span>
                  <StatusBadge status={o.status} />
                </span>
                <span className="text-xs text-muted">{faDate(o.createdAt)} · {faDigits(o._count.items)} قلم کالا</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[11px] text-muted">مبلغ کل سفارش</span>
                  <span className="text-sm font-black">{toman(o.total)} تومان</span>
                </div>
                <Link href={`/profile/orders/${o.number}`} className="btn-ghost px-4 py-2 text-xs">جزئیات سفارش</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
