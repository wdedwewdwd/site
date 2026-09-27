"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { refreshProductRating } from "@/lib/reviews";
import { REPLY_MAX } from "@/lib/reviews-shared";
import { idSchema, text } from "@/lib/validation";

export type ReviewAdminResult = { ok: boolean; message: string };

const replySchema = text(REPLY_MAX, 0);

async function load(id: string) {
  if (!idSchema.safeParse(id).success) return null;
  return db.review.findUnique({
    where: { id },
    select: { id: true, approved: true, userId: true, productId: true, product: { select: { slug: true, name: true } } },
  });
}

function refresh(slug: string) {
  revalidatePath(`/product/${slug}`);
  revalidatePath("/admin/reviews");
  revalidatePath("/admin", "layout"); // menu badge
}

/** Publishes or hides a review; the product's rating follows the published reviews. */
export async function setReviewApproved(id: string, approved: boolean): Promise<ReviewAdminResult> {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  const review = await load(id);
  if (!review) return { ok: false, message: "این نظر پیدا نشد." };
  if (review.approved === approved) return { ok: true, message: approved ? "این نظر قبلاً منتشر شده است." : "این نظر منتشر نشده است." };

  await db.review.update({ where: { id }, data: { approved } });
  await refreshProductRating(review.productId);
  if (approved) {
    await db.notification.create({
      data: {
        userId: review.userId,
        title: "نظر شما منتشر شد",
        body: `نظر شما درباره «${review.product.name}» تأیید و در صفحه محصول نمایش داده شد. ممنون که تجربه‌تان را به اشتراک گذاشتید.`,
        href: `/product/${review.product.slug}#reviews`,
      },
    });
  }
  await audit(staff.id, approved ? "review.approve" : "review.hide", "Review", id);
  refresh(review.product.slug);
  return { ok: true, message: approved ? "نظر منتشر شد." : "نظر از سایت برداشته شد." };
}

export async function deleteReview(id: string): Promise<ReviewAdminResult> {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  const review = await load(id);
  if (!review) return { ok: false, message: "این نظر پیدا نشد." };

  await db.review.delete({ where: { id } });
  if (review.approved) await refreshProductRating(review.productId);
  await audit(staff.id, "review.delete", "Review", id, { productId: review.productId });
  refresh(review.product.slug);
  return { ok: true, message: "نظر حذف شد." };
}

/** Public answer from the shop under a review; an empty text removes it. */
export async function replyToReview(id: string, reply: string): Promise<ReviewAdminResult> {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  const parsed = replySchema.safeParse(reply ?? "");
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const review = await load(id);
  if (!review) return { ok: false, message: "این نظر پیدا نشد." };

  const text = parsed.data;
  await db.review.update({ where: { id }, data: { reply: text || null, repliedAt: text ? new Date() : null } });
  await audit(staff.id, text ? "review.reply" : "review.reply.remove", "Review", id);
  refresh(review.product.slug);
  return { ok: true, message: text ? "پاسخ فروشگاه ذخیره شد." : "پاسخ فروشگاه حذف شد." };
}
