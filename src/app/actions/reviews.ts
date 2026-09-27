"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { REVIEW_MAX, REVIEW_MIN, refreshProductRating } from "@/lib/reviews";
import { idSchema, text } from "@/lib/validation";

export type ReviewFormState = { ok: boolean; message: string } | null;

const schema = z.object({
  productId: idSchema,
  rating: z.coerce.number().int().min(1, "لطفاً امتیاز (ستاره) را انتخاب کنید").max(5, "امتیاز معتبر نیست"),
  body: text(REVIEW_MAX, 0).refine((v) => v.length >= REVIEW_MIN, `لطفاً نظرتان را بنویسید (حداقل ${REVIEW_MIN} حرف)`),
});

/**
 * One review per customer per product. Writing again edits it; every new or edited
 * review waits for staff approval before it is shown or counted in the rating.
 */
export async function submitReview(_: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const user = await getUser();
  if (!user) return { ok: false, message: "برای ثبت نظر ابتدا وارد حساب کاربری شوید." };

  const parsed = schema.safeParse({ productId: formData.get("productId"), rating: formData.get("rating") ?? 0, body: formData.get("body") ?? "" });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { productId, rating, body } = parsed.data;

  const rl = await rateLimit(`review:${user.id}`, 10, 3600);
  if (!rl.ok) return { ok: false, message: "تعداد ثبت نظر زیاد است؛ کمی بعد دوباره تلاش کنید." };

  const product = await db.product.findFirst({ where: { id: productId, isActive: true }, select: { slug: true } });
  if (!product) return { ok: false, message: "این محصول پیدا نشد." };

  const previous = await db.review.findUnique({ where: { productId_userId: { productId, userId: user.id } }, select: { approved: true } });
  await db.review.upsert({
    where: { productId_userId: { productId, userId: user.id } },
    create: { productId, userId: user.id, rating, body },
    update: { rating, body, approved: false },
  });
  // An edited review leaves the published list until it is approved again.
  if (previous?.approved) await refreshProductRating(productId);

  revalidatePath(`/product/${product.slug}`);
  revalidatePath("/admin/reviews");
  return { ok: true, message: "نظر شما ثبت شد و پس از بررسی و تأیید، روی سایت نمایش داده می‌شود. ممنون از شما!" };
}

export async function deleteOwnReview(productId: string): Promise<ReviewFormState> {
  const user = await getUser();
  if (!user) return { ok: false, message: "ابتدا وارد حساب کاربری شوید." };
  if (!idSchema.safeParse(productId).success) return { ok: false, message: "درخواست نامعتبر است." };

  const review = await db.review.findUnique({
    where: { productId_userId: { productId, userId: user.id } },
    select: { id: true, approved: true, product: { select: { slug: true } } },
  });
  if (!review) return { ok: false, message: "نظری برای حذف پیدا نشد." };

  await db.review.delete({ where: { id: review.id } });
  if (review.approved) await refreshProductRating(productId);
  revalidatePath(`/product/${review.product.slug}`);
  revalidatePath("/admin/reviews");
  return { ok: true, message: "نظر شما حذف شد." };
}
