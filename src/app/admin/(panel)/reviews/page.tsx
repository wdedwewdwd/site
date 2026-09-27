import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { faDateTime, faDigits } from "@/lib/format";
import { reviewerName } from "@/lib/reviews";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { ReviewModerationCard } from "@/components/admin/ReviewModerationCard";

export const metadata = { title: "نظرات کاربران" };

const TABS = [
  { key: "pending", label: "در انتظار تأیید" },
  { key: "published", label: "منتشر شده" },
  { key: "all", label: "همه" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const BOUGHT = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function ReviewsAdminPage({ searchParams }: PageProps<"/admin/reviews">) {
  await requireStaff(["ADMIN", "SUPPORT"]);
  const raw = (await searchParams).tab;
  const tab: Tab = TABS.some((t) => t.key === raw) ? (raw as Tab) : "pending";
  const where = tab === "pending" ? { approved: false } : tab === "published" ? { approved: true } : {};

  const [reviews, pending, published] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { firstName: true, lastName: true, phone: true } },
        product: { select: { name: true, slug: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } },
      },
    }),
    db.review.count({ where: { approved: false } }),
    db.review.count({ where: { approved: true } }),
  ]);

  // Which reviewers actually bought the product they wrote about.
  const bought = reviews.length
    ? await db.orderItem.findMany({
        where: {
          productId: { in: [...new Set(reviews.map((r) => r.productId))] },
          order: { userId: { in: [...new Set(reviews.map((r) => r.userId))] }, status: { in: [...BOUGHT] } },
        },
        select: { productId: true, order: { select: { userId: true } } },
      })
    : [];
  const buyerKeys = new Set(bought.map((b) => `${b.order.userId}:${b.productId}`));
  const counts: Record<Tab, number> = { pending, published, all: pending + published };

  return (
    <>
      <PageHeader title="نظرات کاربران" />
      <HelpBox
        items={[
          "مشتری‌ها در پایین صفحه هر محصول امتیاز (۱ تا ۵ ستاره) و نظرشان را می‌نویسند. هر نظر تا وقتی شما «تأیید و انتشار» را نزنید، روی سایت دیده نمی‌شود.",
          "امتیاز ستاره‌ای هر محصول (روی کارت محصول و در صفحه آن) فقط از نظرهای منتشرشده حساب می‌شود.",
          "برچسب «خریدار این کالا» یعنی این مشتری واقعاً این محصول را از سایت خریده است.",
          "با «پاسخ فروشگاه» می‌توانید جواب نظر را بدهید؛ پاسخ زیر همان نظر در سایت نمایش داده می‌شود.",
          "اگر مشتری نظرش را ویرایش کند، دوباره به «در انتظار تأیید» برمی‌گردد. پس از انتشار، به مشتری اعلان داده می‌شود.",
          "نظرهای نامناسب، تبلیغاتی یا دارای شماره تماس را منتشر نکنید یا حذف کنید.",
        ]}
      />

      <nav className="mb-5 flex w-fit gap-1 rounded-xl bg-white p-1 shadow-sm" aria-label="وضعیت نظرها">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "pending" ? "/admin/reviews" : `/admin/reviews?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${tab === t.key ? "bg-night text-white" : "text-muted hover:text-ink"}`}
          >
            {t.label}
            <span className={`rounded-full px-1.5 text-[11px] ${tab === t.key ? "bg-white/15" : t.key === "pending" && counts.pending ? "bg-warning-soft text-warning" : "bg-surface"}`}>
              {faDigits(counts[t.key])}
            </span>
          </Link>
        ))}
      </nav>

      {reviews.length === 0 ? (
        <p className="card p-10 text-center text-sm text-muted">
          {tab === "pending" ? "نظر تازه‌ای برای بررسی نیست." : "نظری در این بخش نیست."}
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {reviews.map((r) => (
            <ReviewModerationCard
              key={`${r.id}:${r.approved}:${r.reply ?? ""}`}
              review={{
                id: r.id,
                rating: r.rating,
                body: r.body,
                approved: r.approved,
                reply: r.reply,
                date: faDateTime(r.updatedAt),
                customer: reviewerName(r.user),
                phone: r.user.phone,
                buyer: buyerKeys.has(`${r.userId}:${r.productId}`),
                product: { name: r.product.name, slug: r.product.slug, image: r.product.images[0]?.url ?? null },
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
