import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { faDateTime, faDigits, toman } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/shop";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import type { OrderStatus } from "@/generated/prisma/client";

export const metadata = { title: "سفارش‌ها" };

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaff(["ADMIN", "SUPPORT"]);
  const sp = await searchParams;
  const status = typeof sp.status === "string" && sp.status in ORDER_STATUS ? (sp.status as OrderStatus) : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 30) : "";
  const num = /^\d+$/.test(q) ? Number(q) : undefined;

  const orders = await db.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [...(num && num < 2 ** 31 ? [{ number: num }] : []), { user: { phone: { contains: q } } }, { receiverName: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { firstName: true, lastName: true, phone: true } } },
  });

  const tabs: { key?: OrderStatus; label: string }[] = [{ label: "همه" }, ...(Object.keys(ORDER_STATUS) as OrderStatus[]).map((k) => ({ key: k, label: ORDER_STATUS[k].label }))];

  return (
    <>
      <PageHeader title="سفارش‌ها">
        <form role="search" className="flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="شماره سفارش، موبایل یا نام" className="input w-60 bg-white py-2.5" />
        </form>
      </PageHeader>
      <HelpBox
        items={[
          "مسیر معمول هر سفارش: پرداخت شده ← در حال آماده‌سازی ← در حال ارسال ← تحویل شده.",
          "با دکمه‌های بالای جدول سفارش‌ها را بر اساس وضعیت فیلتر کنید؛ با کادر جستجو شماره سفارش، موبایل یا نام گیرنده را پیدا کنید.",
          "روی شماره سفارش بزنید تا جزئیات، آدرس ارسال و فرم تغییر وضعیت را ببینید.",
          "«در انتظار پرداخت» یعنی مشتری هنوز پرداخت آنلاین را تمام نکرده؛ این سفارش‌ها را ارسال نکنید.",
        ]}
      />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="فیلتر وضعیت">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.key ? `/admin/orders?status=${t.key}` : "/admin/orders"}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${status === t.key ? "bg-ink text-white" : "bg-white text-muted hover:text-ink"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead className="bg-canvas text-muted">
            <tr>
              <th className="px-4 py-3 text-right font-bold">شماره</th>
              <th className="px-4 py-3 text-right font-bold">مشتری</th>
              <th className="px-4 py-3 text-right font-bold">مبلغ</th>
              <th className="px-4 py-3 text-right font-bold">پرداخت</th>
              <th className="px-4 py-3 text-right font-bold">وضعیت</th>
              <th className="px-4 py-3 text-right font-bold">تاریخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-canvas">
                <td className="px-4 py-3 font-black"><Link href={`/admin/orders/${o.number}`} className="hover:text-brand">#{faDigits(o.number)}</Link></td>
                <td className="px-4 py-3">
                  {[o.user.firstName, o.user.lastName].filter(Boolean).join(" ") || "—"}
                  <span className="block text-[11px] text-muted" dir="ltr">{faDigits(o.user.phone)}</span>
                  {!o.postalCode && (
                    <span className="mt-1 inline-block rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-warning">بدون کد پستی</span>
                  )}
                </td>
                <td className="px-4 py-3 font-bold">{toman(o.total)}</td>
                <td className="px-4 py-3 text-muted">{o.paymentMethod === "ONLINE" ? "آنلاین" : "در محل"}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-muted">{faDateTime(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="p-8 text-center text-sm text-muted">سفارشی یافت نشد.</p>}
      </div>
    </>
  );
}
