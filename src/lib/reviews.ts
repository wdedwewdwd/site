import "server-only";
import { db } from "./db";

/** Orders in these states count as "bought this product" for the buyer badge. */
const BOUGHT = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export { REVIEW_MAX, REVIEW_MIN } from "./reviews-shared";

/** Recomputes a product's shown rating from its approved reviews only. */
export async function refreshProductRating(productId: string) {
  const agg = await db.review.aggregate({ where: { productId, approved: true }, _avg: { rating: true }, _count: true });
  await db.product.update({
    where: { id: productId },
    data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count },
  });
}

/** "محمد ش." — first name plus the initial of the last name; never the phone number. */
export function reviewerName(user: { firstName: string | null; lastName: string | null }) {
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (!first) return "کاربر آریزون یدک";
  return last ? `${first} ${last[0]}.` : first;
}

/** Which of these users have a paid order containing the product. */
export async function buyersOf(productId: string, userIds: string[]) {
  if (!userIds.length) return new Set<string>();
  const rows = await db.order.findMany({
    where: { userId: { in: userIds }, status: { in: [...BOUGHT] }, items: { some: { productId } } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return new Set(rows.map((r) => r.userId));
}

/** Star counts 5→1 for the summary bars. */
export async function ratingBreakdown(productId: string) {
  const groups = await db.review.groupBy({ by: ["rating"], where: { productId, approved: true }, _count: true });
  return [5, 4, 3, 2, 1].map((star) => ({ star, count: groups.find((g) => g.rating === star)?._count ?? 0 }));
}
