import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, LayoutDashboard } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { faDate, faDateTime, faDigits, toman } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageBar } from "@/components/layout/PageBar";

export default async function ProfileDashboard() {
  const user = await requireUser("/profile");
  const [total, shipping, delivered, wishlist, recent, me] = await Promise.all([
    db.order.count({ where: { userId: user.id, status: { not: "PENDING_PAYMENT" } } }),
    db.order.count({ where: { userId: user.id, status: { in: ["PAID", "PROCESSING", "SHIPPED"] } } }),
    db.order.count({ where: { userId: user.id, status: "DELIVERED" } }),
    db.wishlistItem.count({ where: { userId: user.id } }),
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { items: { take: 1, include: { product: { select: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } } } },
    }),
    db.user.findUnique({ where: { id: user.id }, select: { lastLoginAt: true } }),
  ]);
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

  const stats = [
    { label: "کل سفارش‌ها", value: `${faDigits(total)} سفارش`, color: "text-ink" },
    { label: "در حال ارسال", value: `${faDigits(shipping)} سفارش`, color: "text-warning" },
    { label: "تحویل شده", value: `${faDigits(delivered)} سفارش`, color: "text-success" },
    { label: "علاقه‌مندی‌ها", value: `${faDigits(wishlist)} محصول`, color: "text-brand" },
  ];

  return (
    <>
      <PageBar title="حساب کاربری" backHref="/" />
    <div className="flex flex-col gap-5">
      {(user.role === "ADMIN" || user.role === "SUPPORT") && (
        <Link href="/admin" className="flex items-center gap-4 rounded-card bg-night p-5 text-white transition-colors hover:bg-ink">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-ink">
            <LayoutDashboard className="size-6" aria-hidden />
          </span>
          <span className="flex flex-1 flex-col gap-1">
            <span className="text-base font-black">ورود به پنل مدیریت</span>
            <span className="text-xs text-white/60">سفارش‌ها، محصولات، گفتگوها و تنظیمات فروشگاه</span>
          </span>
          <ChevronLeft className="size-5 text-white/60" aria-hidden />
        </Link>
      )}
      <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-lg font-black">سلام {name || "دوست"} عزیز!</h1>
          <p className="text-[13px] text-muted">به پنل کاربری خود خوش آمدید. از این بخش می‌توانید سفارشات و مشخصات خود را مدیریت کنید.</p>
        </div>
        {me?.lastLoginAt && (
          <span className="rounded-lg border border-brand px-3 py-2 text-xs font-bold text-brand">آخرین ورود: {faDateTime(me.lastLoginAt)}</span>
        )}
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="آمار">
        {stats.map((s) => (
          <div key={s.label} className="card flex flex-col gap-3 p-5">
            <span className="text-xs text-muted">{s.label}</span>
            <span className={`text-xl font-black ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </section>

      <section className="card flex flex-col gap-2 p-5" aria-labelledby="recent">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="recent" className="text-base font-black">آخرین سفارش‌های ثبت شده</h2>
          <Link href="/profile/orders" className="text-xs font-bold text-brand hover:underline">مشاهده همه سفارش‌ها</Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">هنوز سفارشی ثبت نکرده‌اید.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((o) => {
              const img = o.items[0]?.product?.images[0];
              return (
                <li key={o.id}>
                  <Link href={`/profile/orders/${o.number}`} className="flex items-center gap-4 py-3 hover:bg-canvas">
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                      {img && <Image src={img.url} alt="" fill sizes="56px" className="object-cover" />}
                    </span>
                    <span className="flex flex-1 flex-col gap-1">
                      <span className="text-sm font-extrabold">سفارش شماره #{faDigits(o.number)}</span>
                      <span className="text-xs text-muted">ثبت شده در تاریخ {faDate(o.createdAt)}</span>
                    </span>
                    <StatusBadge status={o.status} />
                    <span className="hidden text-sm font-black sm:block">{toman(o.total)} تومان</span>
                    <ChevronLeft className="size-5 text-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
    </>
  );
}
