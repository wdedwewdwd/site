import Image from "next/image";
import Link from "next/link";
import { Download, FileText, PackageSearch, Search, ShoppingBag, Truck, X } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { faDigits, toman } from "@/lib/format";
import { invoiceDate, invoiceTitle } from "@/lib/invoice";
import { expireStaleOrders, paymentSecondsLeft } from "@/lib/orders";
import { getShippingConfig } from "@/lib/settings";
import { toEnDigits } from "@/lib/validation";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { Pagination } from "@/components/ui/Pagination";
import { PayAgainButton } from "@/components/checkout/PayAgainButton";
import { PaymentCountdown } from "@/components/orders/OrderButtons";
import { PageBar } from "@/components/layout/PageBar";

const TABS: { key: string; label: string; statuses?: OrderStatus[] }[] = [
  { key: "all", label: "همه" },
  { key: "pending", label: "در انتظار پرداخت", statuses: ["PENDING_PAYMENT"] },
  { key: "active", label: "در حال پردازش و ارسال", statuses: ["PAID", "PROCESSING", "SHIPPED"] },
  { key: "delivered", label: "تحویل شده", statuses: ["DELIVERED"] },
  { key: "returned", label: "لغو و مرجوعی", statuses: ["CANCELLED", "REFUNDED"] },
];
const PER_PAGE = 10;
const THUMBS = 4;

export default async function OrdersPage({ searchParams }: PageProps<"/profile/orders">) {
  const user = await requireUser("/profile/orders");
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0];
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const requestedPage = Math.max(1, Math.floor(Number(sp.page)) || 1);

  // Search by order number («۱۲۳۴» or «#1234») or by a product's name or code in the order.
  const needle = q.replace(/ي/g, "ی").replace(/ك/g, "ک");
  const asNumber = toEnDigits(needle).replace(/^#/, "");
  const search: Prisma.OrderWhereInput | null = q
    ? {
        OR: [
          ...(/^\d{1,9}$/.test(asNumber) ? [{ number: Number(asNumber) }] : []),
          { items: { some: { OR: [{ name: { contains: needle, mode: "insensitive" } }, { sku: { contains: toEnDigits(needle), mode: "insensitive" } }] } } },
        ],
      }
    : null;
  const where: Prisma.OrderWhereInput = {
    userId: user.id,
    ...(tab.statuses ? { status: { in: tab.statuses } } : {}),
    ...(search ? { AND: [search] } : {}),
  };

  // Unpaid orders past their payment window are cancelled first, so the tabs and counts are right.
  await expireStaleOrders();
  const [total, counts, shipping] = await Promise.all([
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], where: { userId: user.id }, _count: true }),
    getShippingConfig(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(requestedPage, pages);
  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE,
    include: {
      items: {
        orderBy: { id: "asc" },
        select: { id: true, name: true, quantity: true, product: { select: { images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } } },
      },
    },
  });
  const countFor = (t: (typeof TABS)[number]) =>
    counts.filter((c) => !t.statuses || t.statuses.includes(c.status)).reduce((s, c) => s + c._count, 0);
  const href = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const merged = { tab: tab.key === "all" ? null : tab.key, q: q || null, page: null, ...changes };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === "1")) params.set(k, v);
    const s = params.toString();
    return s ? `/profile/orders?${s}` : "/profile/orders";
  };

  return (
    <>
      <PageBar title="سفارش‌های من" backHref="/profile" crumbs={[{ href: "/profile", label: "حساب کاربری" }]} />
      <div className="card flex flex-col gap-5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="sr-only text-lg font-black md:not-sr-only">تاریخچه سفارش‌ها</h1>
          <form action="/profile/orders" method="get" role="search" className="relative w-full sm:max-w-xs">
            {tab.key !== "all" && <input type="hidden" name="tab" value={tab.key} />}
            <label htmlFor="order-search" className="sr-only">جستجو در سفارش‌ها</label>
            <input
              id="order-search"
              name="q"
              defaultValue={q}
              maxLength={60}
              placeholder="شماره سفارش یا نام کالا"
              className="input py-2.5 pl-20 pr-10"
            />
            <Search className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            {q && (
              <Link href={href({ q: null })} aria-label="پاک کردن جستجو" className="absolute left-12 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-surface">
                <X className="size-4" />
              </Link>
            )}
            <button type="submit" className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white">
              جستجو
            </button>
          </form>
        </div>

        <nav aria-label="فیلتر وضعیت" className="no-scrollbar -mx-4 overflow-x-auto border-b border-line px-4 sm:-mx-5 sm:px-5">
          <ul className="flex gap-6 text-sm">
            {TABS.map((t) => (
              <li key={t.key}>
                <Link
                  href={href({ tab: t.key === "all" ? null : t.key })}
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

        {q && (
          <p className="text-[13px] text-muted">
            {faDigits(total)} سفارش برای «{q}» پیدا شد.
          </p>
        )}

        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-surface text-muted">
              {q ? <PackageSearch className="size-8" aria-hidden /> : <ShoppingBag className="size-8" aria-hidden />}
            </span>
            <p className="text-sm font-bold">{q ? `سفارشی با «${q}» پیدا نشد.` : countFor(TABS[0]) ? "سفارشی در این بخش نیست." : "هنوز سفارشی ثبت نکرده‌اید."}</p>
            {!countFor(TABS[0]) && (
              <Link href="/products" className="btn-primary px-5 py-2.5">
                مشاهده محصولات
              </Link>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {orders.map((o) => {
              const pending = o.status === "PENDING_PAYMENT";
              const pieces = o.items.reduce((s, i) => s + i.quantity, 0);
              const title = invoiceTitle(o);
              return (
                <li key={o.id} className="overflow-hidden rounded-card border border-line">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-canvas px-4 py-3">
                    <span className="flex items-center gap-2.5">
                      <Link href={`/profile/orders/${o.number}`} className="text-sm font-black hover:text-brand">
                        سفارش #{faDigits(o.number)}
                      </Link>
                      <StatusBadge status={o.status} />
                    </span>
                    <span className="text-xs text-muted">{invoiceDate(o.createdAt)}</span>
                  </div>

                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link href={`/profile/orders/${o.number}`} className="flex items-center gap-2" aria-label={`کالاهای سفارش ${faDigits(o.number)}`}>
                      {o.items.slice(0, THUMBS).map((i) => (
                        <span key={i.id} className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-line bg-surface" title={i.name}>
                          {i.product?.images[0] && <Image src={i.product.images[0].url} alt="" fill sizes="56px" className="object-cover" />}
                        </span>
                      ))}
                      {o.items.length > THUMBS && (
                        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-surface text-xs font-black text-muted">
                          +{faDigits(o.items.length - THUMBS)}
                        </span>
                      )}
                    </Link>
                    <dl className="grid grid-cols-3 gap-3 text-xs sm:flex sm:gap-8">
                      <div className="flex flex-col gap-1">
                        <dt className="text-muted">تعداد کالا</dt>
                        <dd className="font-extrabold">{faDigits(pieces)} عدد</dd>
                      </div>
                      <div className="flex flex-col gap-1">
                        <dt className="text-muted">روش ارسال</dt>
                        <dd className="font-extrabold">{shipping.methods[o.shippingMethod].title}</dd>
                      </div>
                      <div className="flex flex-col gap-1">
                        <dt className="text-muted">مبلغ کل</dt>
                        <dd className="whitespace-nowrap text-sm font-black">{toman(o.total)} تومان</dd>
                      </div>
                    </dl>
                  </div>

                  {pending && (
                    <div className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-soft px-3 py-2.5">
                      <PaymentCountdown seconds={paymentSecondsLeft(o.createdAt)} />
                      <PayAgainButton orderId={o.id} />
                    </div>
                  )}
                  {o.trackingCode && (o.status === "SHIPPED" || o.status === "DELIVERED") && (
                    <div className="mx-4 mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-info-soft px-3 py-2 text-xs">
                      <Truck className="size-4 text-info" aria-hidden />
                      <span className="text-muted">{o.carrier ? `${o.carrier} — ` : ""}کد رهگیری:</span>
                      <span className="font-black" dir="ltr">{faDigits(o.trackingCode)}</span>
                      <CopyButton value={o.trackingCode} />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 border-t border-line px-4 py-3 sm:flex sm:flex-wrap">
                    <Link href={`/profile/orders/${o.number}`} className="btn-primary px-2 py-2 text-xs sm:px-4">
                      جزئیات سفارش
                    </Link>
                    <Link href={`/profile/orders/${o.number}/invoice`} className="btn-ghost gap-1.5 px-2 py-2 text-xs sm:px-4">
                      <FileText className="size-4 shrink-0" aria-hidden />
                      {title}
                    </Link>
                    <a href={`/api/orders/${o.number}/invoice`} download className="btn-ghost gap-1.5 px-2 py-2 text-xs sm:px-4">
                      <Download className="size-4 shrink-0" aria-hidden />
                      PDF
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {pages > 1 && <Pagination page={page} pages={pages} href={(n) => href({ page: String(n) })} />}
      </div>
    </>
  );
}
