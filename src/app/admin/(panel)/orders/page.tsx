import Link from "next/link";
import { Printer } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { expireStaleOrders } from "@/lib/orders";
import { faDateTime, faDigits, toman } from "@/lib/format";
import { tehranToday } from "@/lib/jalali";
import { ORDER_PRESETS, ORDERS_PAGE_SIZE, orderWhere, parseOrderFilters } from "@/lib/admin-orders";
import { ORDER_STATUS } from "@/lib/shop";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { OrdersFilterBar } from "@/components/admin/orders/OrdersFilterBar";
import type { OrderStatus } from "@/generated/prisma/client";

export const metadata = { title: "سفارش‌ها" };

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaff(["ADMIN", "SUPPORT"]);
  await expireStaleOrders();
  const sp = await searchParams;
  const f = parseOrderFilters(sp);
  const where = orderWhere(f);

  const [orders, total, byStatus] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
      include: {
        user: { select: { firstName: true, lastName: true, phone: true } },
        _count: { select: { items: true } },
        payments: { where: { status: "SUCCEEDED" }, select: { id: true }, take: 1 },
      },
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], where: orderWhere(f, false), _count: true }),
  ]);
  const pages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));
  const countOf = (s?: OrderStatus) => byStatus.filter((b) => !s || b.status === s).reduce((n, b) => n + b._count, 0);

  const qs = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string") p.set(k, v);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };
  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "page") exportParams.set(k, v);

  const tabs: { key?: OrderStatus; label: string }[] = [{ label: "همه" }, ...(Object.keys(ORDER_STATUS) as OrderStatus[]).map((k) => ({ key: k, label: ORDER_STATUS[k].label }))];
  const filtered = !!(f.q || f.pay || f.noPostal || f.from || f.status);

  return (
    <>
      <PageHeader title="سفارش‌ها" />
      <HelpBox
        items={[
          "سفارش‌های جدیدی که باید رسیدگی شوند در تب «پرداخت شده» هستند (عدد قرمز منو). سفارش‌های پرداخت در محل مستقیم در «در حال آماده‌سازی» قرار می‌گیرند.",
          "با کادر جستجو شماره سفارش، موبایل، نام گیرنده یا کد رهگیری را پیدا کنید. بازه تاریخ شمسی و به وقت تهران است.",
          "«فقط بدون کد پستی» سفارش‌هایی را نشان می‌دهد که باید برای گرفتن کد پستی با مشتری تماس بگیرید.",
          "آیکون چاپ در هر ردیف، فاکتور و برچسب پستی همان سفارش را باز می‌کند. «خروجی اکسل» همه سفارش‌های فیلترشده را دانلود می‌کند.",
        ]}
      />
      <OrdersFilterBar
        from={f.from ?? null}
        to={f.to ?? null}
        today={tehranToday()}
        preset={f.preset ?? null}
        presets={ORDER_PRESETS}
        q={f.q ?? ""}
        pay={f.pay ?? ""}
        noPostal={!!f.noPostal}
        exportHref={`/api/admin/orders/export?${exportParams.toString()}`}
        filtered={filtered}
      />

      <nav className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="فیلتر وضعیت">
        {tabs.map((t) => {
          const active = f.status === t.key;
          return (
            <Link
              key={t.label}
              href={qs({ status: t.key ?? null, page: null })}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${active ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink"}`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/20" : "bg-surface"}`}>{faDigits(countOf(t.key))}</span>
            </Link>
          );
        })}
      </nav>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[980px] text-[13px]">
          <thead className="bg-canvas text-muted">
            <tr>
              <th className="px-4 py-3 text-right font-bold">شماره</th>
              <th className="px-4 py-3 text-right font-bold">مشتری</th>
              <th className="px-4 py-3 text-right font-bold">شهر</th>
              <th className="px-4 py-3 text-right font-bold">اقلام</th>
              <th className="px-4 py-3 text-right font-bold">مبلغ (تومان)</th>
              <th className="px-4 py-3 text-right font-bold">پرداخت</th>
              <th className="px-4 py-3 text-right font-bold">وضعیت</th>
              <th className="px-4 py-3 text-right font-bold">زمان ثبت (تهران)</th>
              <th className="px-4 py-3" aria-label="چاپ" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-canvas">
                <td className="px-4 py-3 font-black"><Link href={`/admin/orders/${o.number}`} className="hover:text-brand">#{faDigits(o.number)}</Link></td>
                <td className="px-4 py-3">
                  {[o.user.firstName, o.user.lastName].filter(Boolean).join(" ") || o.receiverName}
                  <span className="block text-[11px] text-muted" dir="ltr">{faDigits(o.user.phone)}</span>
                  {!o.postalCode && <span className="mt-1 inline-block rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-warning">بدون کد پستی</span>}
                </td>
                <td className="px-4 py-3 text-muted">{o.city}</td>
                <td className="px-4 py-3">{faDigits(o._count.items)}</td>
                <td className="px-4 py-3 font-bold">{toman(o.total)}</td>
                <td className="px-4 py-3">
                  <span className="block">{o.paymentMethod === "ONLINE" ? "آنلاین" : "در محل"}</span>
                  <span className={`text-[11px] font-bold ${o.payments.length ? "text-success" : "text-muted"}`}>{o.payments.length ? "پرداخت‌شده" : "پرداخت‌نشده"}</span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-muted">{faDateTime(o.createdAt)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/invoice/${o.number}`} target="_blank" aria-label={`چاپ فاکتور سفارش ${o.number}`} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink">
                    <Printer className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="p-10 text-center text-sm text-muted">سفارشی با این فیلترها یافت نشد.</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>{faDigits(total)} سفارش</span>
        {pages > 1 && (
          <nav className="flex items-center gap-1" aria-label="صفحه‌بندی">
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === pages || Math.abs(n - f.page) <= 2)
              .map((n, i, arr) => (
                <span key={n} className="flex items-center gap-1">
                  {i > 0 && n - arr[i - 1] > 1 && <span className="px-1">…</span>}
                  <Link
                    href={qs({ page: n === 1 ? null : String(n) })}
                    aria-current={n === f.page ? "page" : undefined}
                    className={`grid size-9 place-items-center rounded-lg font-bold ${n === f.page ? "bg-ink text-white" : "bg-white ring-1 ring-line hover:bg-canvas"}`}
                  >
                    {faDigits(n)}
                  </Link>
                </span>
              ))}
          </nav>
        )}
      </div>
    </>
  );
}
