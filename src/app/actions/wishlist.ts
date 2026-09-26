"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation";

export async function toggleWishlist(productId: string): Promise<{ ok: true; saved: boolean } | { ok: false; error: string; login?: boolean }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "برای ذخیره علاقه‌مندی‌ها وارد شوید.", login: true };
  if (!idSchema.safeParse(productId).success) return { ok: false, error: "درخواست نامعتبر است." };

  const key = { userId_productId: { userId: user.id, productId } };
  const existing = await db.wishlistItem.findUnique({ where: key });
  if (existing) {
    await db.wishlistItem.delete({ where: key });
  } else {
    const exists = await db.product.count({ where: { id: productId } });
    if (!exists) return { ok: false, error: "محصول یافت نشد." };
    await db.wishlistItem.create({ data: { userId: user.id, productId } });
  }
  revalidatePath("/profile/wishlist");
  return { ok: true, saved: !existing };
}
