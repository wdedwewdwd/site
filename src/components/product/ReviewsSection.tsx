import { BadgeCheck, MessageSquareText, Store } from "lucide-react";
import { db } from "@/lib/db";
import { faDate, faDigits, rating as fmtRating } from "@/lib/format";
import { SITE } from "@/lib/shop";
import { buyersOf, ratingBreakdown, reviewerName } from "@/lib/reviews";
import { Stars } from "@/components/ui/Stars";
import { ReviewForm } from "./ReviewForm";

type Props = {
  product: { id: string; slug: string; ratingAvg: number; ratingCount: number };
  userId: string | null;
};

/** Rating summary, the customer's own review box and the published reviews of a product. */
export async function ReviewsSection({ product, userId }: Props) {
  const [reviews, breakdown, own] = await Promise.all([
    db.review.findMany({
      where: { productId: product.id, approved: true },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, userId: true, rating: true, body: true, reply: true, createdAt: true, user: { select: { firstName: true, lastName: true } } },
    }),
    ratingBreakdown(product.id),
    userId
      ? db.review.findUnique({ where: { productId_userId: { productId: product.id, userId } }, select: { rating: true, body: true, approved: true } })
      : null,
  ]);
  const buyers = await buyersOf(product.id, reviews.map((r) => r.userId));
  const total = product.ratingCount;

  return (
    <section id="reviews" className="flex scroll-mt-24 flex-col gap-5" aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="text-base font-black md:text-lg">
        نظرات و امتیاز خریداران {total > 0 && <span className="text-sm font-bold text-muted">({faDigits(total)})</span>}
      </h2>

      <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="flex flex-col gap-4">
          <div className="card flex flex-col gap-4 p-5">
            {total > 0 ? (
              <>
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-black">{fmtRating(product.ratingAvg)}</span>
                  <div className="flex flex-col gap-1.5">
                    <Stars value={product.ratingAvg} />
                    <span className="text-xs text-muted">از ۵ · بر اساس {faDigits(total)} نظر</span>
                  </div>
                </div>
                <ul className="flex flex-col gap-2" aria-label="تعداد امتیازها">
                  {breakdown.map(({ star, count }) => (
                    <li key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-12 shrink-0 text-muted">{faDigits(star)} ستاره</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                        <span className="block h-full rounded-full bg-star" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
                      </span>
                      <span className="w-6 shrink-0 text-left text-muted">{faDigits(count)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-muted">
                  <MessageSquareText className="size-5" aria-hidden />
                </span>
                <p className="text-[13px] leading-6 text-muted">هنوز امتیازی برای این کالا ثبت نشده است. اولین نفری باشید که نظر می‌دهد.</p>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="mb-3 text-sm font-black">{own ? "نظر شما درباره این کالا" : "نظر خود را بنویسید"}</h3>
            <ReviewForm
              productId={product.id}
              loggedIn={!!userId}
              loginHref={`/login?next=${encodeURIComponent(`/product/${product.slug}#reviews`)}`}
              own={own}
            />
          </div>
        </aside>

        {reviews.length === 0 ? (
          <p className="card p-8 text-center text-sm text-muted">هنوز نظری برای این کالا منتشر نشده است.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reviews.map((r) => {
              const name = reviewerName(r.user);
              return (
                <li key={r.id}>
                  <article className="card flex flex-col gap-3 p-5">
                    <header className="flex flex-wrap items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-night text-sm font-black text-white" aria-hidden>
                        {name[0]}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                          {name}
                          {buyers.has(r.userId) && (
                            <span className="flex items-center gap-1 rounded-md bg-success-soft px-1.5 py-0.5 text-[10px] font-bold text-success">
                              <BadgeCheck className="size-3" aria-hidden /> خریدار این کالا
                            </span>
                          )}
                        </p>
                        <time className="text-[11px] text-muted" dateTime={r.createdAt.toISOString()}>{faDate(r.createdAt)}</time>
                      </div>
                      <Stars value={r.rating} />
                    </header>
                    <p className="whitespace-pre-line text-[13px] leading-7">{r.body}</p>
                    {r.reply && (
                      <div className="rounded-xl border-r-4 border-brand bg-canvas p-4">
                        <p className="mb-1 flex items-center gap-1.5 text-xs font-black">
                          <Store className="size-3.5 text-brand" aria-hidden /> پاسخ {SITE.name}
                        </p>
                        <p className="whitespace-pre-line text-[13px] leading-7 text-ink/80">{r.reply}</p>
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
