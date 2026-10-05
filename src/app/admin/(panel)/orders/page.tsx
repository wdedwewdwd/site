import Link from "next/link";
import { Clock3, Printer } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { expireStaleOrders } from "@/lib/orders";
import { faDateTime, faDigits, toman } from "@/lib/format";
import { tehranToday } from "@/lib/jalali";
import { ORDER_PRESETS, ORDERS_PAGE_SIZE, orderSort, orderWhere, parseOrderFilters, waitingTime, type StatusFilter } from "@/lib/admin-orders";
import { NEEDS_ACTION } from "@/lib/order-flow";
import { ORDER_STATUS } from "@/lib/shop";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { OrdersFilterBar } from "@/components/admin/orders/OrdersFilterBar";
import { BULK_FORM, BulkPrintBar } from "@/components/admin/orders/BulkPrintBar";
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
      orderBy: orderSort(f),
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
  const countOf = (s?: StatusFilter) =>
    byStatus.filter((b) => !s || (s === "todo" ? NEEDS_ACTION.includes(b.status) : b.status === s)).reduce((n, b) => n + b._count, 0);

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

  const tabs: { key?: StatusFilter; label: string }[] = [
    { label: "همه" },
    { key: "todo", label: "نیاز به اقدام" },
    ...(Object.keys(ORDER_STATUS) as OrderStatus[]).map((k) => ({ key: k, label: ORDER_STATUS[k].label })),
  ];
  const filtered = !!(f.q || f.pay || f.noPostal || f.from || f.status);
  const rows = orders.map((o) => ({
    ...o,
    customer: [o.user.firstName, o.user.lastName].filter(Boolean).join(" ") || o.receiverName,
    paid: o.payments.length > 0,
    waiting: NEEDS_ACTION.includes(o.status) ? waitingTime(o.createdAt) : null,
  }));

  return (
    <>
      <PageHeader title="سفارش‌ها" />
      <HelpBox
        items={[
          "کارهای روزانه در تب «نیاز به اقدام» است: سفارش‌های پرداخت‌شده و سفارش‌های در حال آماده‌سازی (از جمله سفارش‌های پرداخت در محل)، قدیمی‌ترین بالا. عدد قرمز منو همین تعداد است.",
          "زیر هر سفارش منتظر، مدت انتظار نوشته شده؛ اگر بیش از یک روز شده باشد قرمز می‌شود.",
          "با کادر جستجو شماره سفارش، موبایل، نام مشتری یا گیرنده، کد رهگیری یا نام و کد کالا را پیدا کنید. بازه تاریخ شمسی و به وقت تهران است.",
          "«فقط بدون کد پستی» سفارش‌هایی را نشان می‌دهد که باید برای گرفتن کد پستی با مشتری تماس بگیرید.",
          "برای چاپ چند فاکتور و برچسب پستی با هم، سفارش‌ها را تیک بزنید و «چاپ فاکتور و برچسب» را بزنید؛ هر سفارش در یک صفحه جدا چاپ می‌شود. «خروجی اکسل» همه سفارش‌های فیلترشده را دانلود می‌کند.",
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
          const count = countOf(t.key);
          const urgent = t.key === "todo" && count > 0;
          return (
            <Link
              key={t.label}
              href={qs({ status: t.key ?? null, page: null })}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${active ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink"}`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 text-[10px] ${urgent ? "bg-brand text-white" : active ? "bg-white/20" : "bg-surface"}`}>{faDigits(count)}</span>
            </Link>
          );
        })}
      </nav>

      <BulkPrintBar key={JSON.stringify(sp)} rows={rows.length} />

      {/* Phones: one card per order */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((o) => (
          <li key={o.id} className="card relative flex flex-col gap-2 p-4 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2.5">
                <input type="checkbox" name="n" value={o.number} form={BULK_FORM} aria-label={`انتخاب سفارش ${o.number} برای چاپ`} className="relative z-10 size-4 accent-brand" />
                <Link href={`/admin/orders/${o.number}`} className="font-black after:absolute after:inset-0">#{faDigits(o.number)}</Link>
              </span>
              <StatusBadge status={o.status} />
            </div>
            <p className="flex items-center justify-between gap-2">
              <b>{o.customer}</b>
              <span className="text-[11px] text-muted" dir="ltr">{faDigits(o.user.phone)}</span>
            </p>
            <p className="flex items-center justify-between gap-2 text-muted">
              <span>{o.city}، {faDigits(o._count.items)} قلم</span>
              <b className="text-ink">{toman(o.total)} تومان</b>
            </p>
            <p className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`font-bold ${o.paid ? "text-success" : "text-muted"}`}>
                {o.paymentMethod === "ONLINE" ? "آنلاین" : "در محل"} · {o.paid ? "پرداخت‌شده" : "پرداخت‌نشده"}
              </span>
              {!o.postalCode && o.shippingMethod !== "PICKUP" && <span className="rounded bg-warning-soft px-1.5 py-0.5 font-bold text-warning">بدون کد پستی</span>}
              <span className="mr-auto text-muted">{faDateTime(o.createdAt)}</span>
            </p>
            {o.waiting && <Waiting {...o.waiting} />}
          </li>
        ))}
        {rows.length === 0 && <li className="card p-10 text-center text-sm text-muted">سفارشی با این فیلترها یافت نشد.</li>}
      </ul>

      {/* Tablets and desktops: table */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1000px] text-[13px]">
          <thead className="bg-canvas text-muted">
            <tr>
              <th className="w-10 px-4 py-3"><span className="sr-only">انتخاب</span></th>
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
            {rows.map((o) => (
              <tr key={o.id} className="hover:bg-canvas">
                <td className="px-4 py-3">
                  <input type="checkbox" name="n" value={o.number} form={BULK_FORM} aria-label={`انتخاب سفارش ${o.number} برای چاپ`} className="size-4 accent-brand" />
                </td>
                <td className="px-4 py-3 font-black"><Link href={`/admin/orders/${o.number}`} className="hover:text-brand">#{faDigits(o.number)}</Link></td>
                <td className="px-4 py-3">
                  {o.customer}
                  <span className="block text-[11px] text-muted" dir="ltr">{faDigits(o.user.phone)}</span>
                  {!o.postalCode && o.shippingMethod !== "PICKUP" && <span className="mt-1 inline-block rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-warning">بدون کد پستی</span>}
                </td>
                <td className="px-4 py-3 text-muted">{o.city}</td>
                <td className="px-4 py-3">{faDigits(o._count.items)}</td>
                <td className="px-4 py-3 font-bold">{toman(o.total)}</td>
                <td className="px-4 py-3">
                  <span className="block">{o.paymentMethod === "ONLINE" ? "آنلاین" : "در محل"}</span>
                  <span className={`text-[11px] font-bold ${o.paid ? "text-success" : "text-muted"}`}>{o.paid ? "پرداخت‌شده" : "پرداخت‌نشده"}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                  {o.waiting && <Waiting {...o.waiting} />}
                </td>
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
        {rows.length === 0 && <p className="p-10 text-center text-sm text-muted">سفارشی با این فیلترها یافت نشد.</p>}
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

function Waiting({ label, late }: { label: string; late: boolean }) {
  return (
    <span className={`mt-1 flex items-center gap-1 text-[11px] font-bold ${late ? "text-brand" : "text-muted"}`}>
      <Clock3 className="size-3.5" aria-hidden /> {label} در انتظار
    </span>
  );
}
