"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureCartId, evaluateDiscount, getCart } from "@/lib/cart";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { MAX_QTY_PER_ITEM } from "@/lib/shop";
import { idSchema, text } from "@/lib/validation";

type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function throttle() {
  const rl = await rateLimit(`cart:${await clientIp()}`, 120, 60);
  return rl.ok;
}

const addSchema = z.object({ productId: idSchema, quantity: z.number().int().min(1).max(MAX_QTY_PER_ITEM).default(1) });

export async function addToCart(input: { productId: string; quantity?: number }): Promise<ActionResult> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "درخواست نامعتبر است." };
  if (!(await throttle())) return { ok: false, error: "درخواست‌های زیاد؛ کمی صبر کنید." };

  const { productId, quantity } = parsed.data;
  const product = await db.product.findFirst({ where: { id: productId, isActive: true }, select: { stock: true } });
  if (!product) return { ok: false, error: "محصول یافت نشد." };
  if (product.stock < 1) return { ok: false, error: "این کالا موجود نیست." };

  const cartId = await ensureCartId();
  const existing = await db.cartItem.findUnique({ where: { cartId_productId: { cartId, productId } } });
  const next = Math.min((existing?.quantity ?? 0) + quantity, product.stock, MAX_QTY_PER_ITEM);

  await db.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    create: { cartId, productId, quantity: next },
    update: { quantity: next },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "به سبد خرید اضافه شد." };
}

const qtySchema = z.object({ productId: idSchema, quantity: z.number().int().min(0).max(MAX_QTY_PER_ITEM) });

export async function setCartQuantity(input: { productId: string; quantity: number }): Promise<ActionResult> {
  const parsed = qtySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "درخواست نامعتبر است." };
  if (!(await throttle())) return { ok: false, error: "درخواست‌های زیاد؛ کمی صبر کنید." };

  const cart = await getCart();
  if (!cart) return { ok: false, error: "سبد خرید یافت نشد." };
  const { productId, quantity } = parsed.data;

  if (quantity === 0) {
    await db.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
  } else {
    const product = await db.product.findUnique({ where: { id: productId }, select: { stock: true } });
    if (!product) return { ok: false, error: "محصول یافت نشد." };
    if (quantity > product.stock) return { ok: false, error: `فقط ${product.stock} عدد موجود است.` };
    await db.cartItem.updateMany({ where: { cartId: cart.id, productId }, data: { quantity } });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearCart(): Promise<ActionResult> {
  const cart = await getCart();
  if (cart) await db.cart.update({ where: { id: cart.id }, data: { discountCode: null, items: { deleteMany: {} } } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function applyDiscount(_: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = text(32).safeParse(formData.get("code") ?? "");
  if (!parsed.success) return { ok: false, error: "کد تخفیف را وارد کنید." };
  // Throttle guessing of discount codes.
  const rl = await rateLimit(`discount:${await clientIp()}`, 10, 600);
  if (!rl.ok) return { ok: false, error: "تلاش‌های زیاد؛ چند دقیقه دیگر امتحان کنید." };

  const cart = await getCart();
  if (!cart || cart.items.length === 0) return { ok: false, error: "سبد خرید خالی است." };

  const code = await db.discountCode.findUnique({ where: { code: parsed.data.toUpperCase() } });
  const check = evaluateDiscount(code, cart.subtotal);
  if (!check.ok) return { ok: false, error: check.error };

  await db.cart.update({ where: { id: cart.id }, data: { discountCode: check.code.code } });
  revalidatePath("/cart");
  return { ok: true, message: "کد تخفیف اعمال شد." };
}

export async function removeDiscount(): Promise<ActionResult> {
  const cart = await getCart();
  if (cart) await db.cart.update({ where: { id: cart.id }, data: { discountCode: null } });
  revalidatePath("/cart");
  return { ok: true };
}
