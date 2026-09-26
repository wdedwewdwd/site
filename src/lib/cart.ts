import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "./db";
import { isProd } from "./env";
import { randomToken } from "./crypto";
import { getUser } from "./auth/session";
import type { DiscountCode } from "@/generated/prisma/client";

const CART_COOKIE = isProd ? "__Host-ay_cart" : "ay_cart";

/** Reads the current cart id without creating one (safe in Server Components). */
async function currentCartId() {
  const user = await getUser();
  if (user) {
    const cart = await db.cart.findUnique({ where: { userId: user.id }, select: { id: true } });
    return cart?.id ?? null;
  }
  const id = (await cookies()).get(CART_COOKIE)?.value;
  return id && /^[A-Za-z0-9_-]{32,64}$/.test(id) ? id : null;
}

/** Returns the cart id, creating a cart if needed. Only call from Server Actions / Route Handlers. */
export async function ensureCartId() {
  const existing = await currentCartId();
  if (existing) {
    // The guest cookie might point to a deleted cart.
    const found = await db.cart.findUnique({ where: { id: existing }, select: { id: true } });
    if (found) return found.id;
  }
  const user = await getUser();
  // Random, unguessable ids: a guest cart id is effectively a bearer token.
  const cart = await db.cart.create({ data: { id: randomToken(32), userId: user?.id } });
  if (!user) {
    (await cookies()).set(CART_COOKIE, cart.id, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return cart.id;
}

/** Moves guest cart items into the user's cart after login. */
export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const guestId = jar.get(CART_COOKIE)?.value;
  if (!guestId) return;
  jar.delete(CART_COOKIE);

  const guest = await db.cart.findFirst({ where: { id: guestId, userId: null }, include: { items: true } });
  if (!guest) return;

  await db.$transaction(async (tx) => {
    const userCart =
      (await tx.cart.findUnique({ where: { userId } })) ??
      (await tx.cart.create({ data: { id: randomToken(32), userId } }));
    for (const item of guest.items) {
      await tx.cartItem.upsert({
        where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
        create: { cartId: userCart.id, productId: item.productId, quantity: item.quantity },
        update: { quantity: { increment: item.quantity } },
      });
    }
    await tx.cart.delete({ where: { id: guest.id } });
  });
}

export type DiscountCheck = { ok: true; amount: number; code: DiscountCode } | { ok: false; error: string };

export function evaluateDiscount(code: DiscountCode | null, subtotal: number): DiscountCheck {
  const now = new Date();
  if (!code || !code.isActive) return { ok: false, error: "کد تخفیف معتبر نیست." };
  if (code.validFrom && code.validFrom > now) return { ok: false, error: "کد تخفیف هنوز فعال نشده است." };
  if (code.validTo && code.validTo < now) return { ok: false, error: "کد تخفیف منقضی شده است." };
  if (code.maxUses !== null && code.usedCount >= code.maxUses) return { ok: false, error: "ظرفیت این کد تخفیف تمام شده است." };
  if (subtotal < code.minOrder) return { ok: false, error: "مبلغ سفارش برای این کد تخفیف کافی نیست." };

  let amount = code.type === "PERCENT" ? Math.floor((subtotal * code.value) / 100) : code.value;
  if (code.maxDiscount) amount = Math.min(amount, code.maxDiscount);
  return { ok: true, amount: Math.min(amount, subtotal), code };
}

/**
 * The single source of truth for cart pricing. Prices always come from the
 * database — never from the client.
 */
export const getCart = cache(async () => {
  const id = await currentCartId();
  if (!id) return null;
  const cart = await db.cart.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { productId: "asc" },
        include: {
          product: {
            select: {
              id: true, slug: true, name: true, sku: true, oemCode: true, price: true, compareAtPrice: true,
              stock: true, isActive: true,
              brand: { select: { name: true, latin: true } },
              images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
            },
          },
        },
      },
    },
  });
  if (!cart) return null;

  const items = cart.items
    .filter((i) => i.product.isActive)
    .map((i) => ({
      ...i,
      available: i.product.stock >= i.quantity,
      lineTotal: i.product.price * i.quantity,
    }));
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const listTotal = items.reduce((s, i) => s + (i.product.compareAtPrice ?? i.product.price) * i.quantity, 0);

  let discount = 0;
  let discountError: string | null = null;
  if (cart.discountCode) {
    const code = await db.discountCode.findUnique({ where: { code: cart.discountCode } });
    const check = evaluateDiscount(code, subtotal);
    if (check.ok) discount = check.amount;
    else discountError = check.error;
  }

  return {
    id: cart.id,
    items,
    count,
    subtotal,
    productSavings: listTotal - subtotal,
    discountCode: cart.discountCode,
    discount,
    discountError,
    allAvailable: items.every((i) => i.available),
  };
});

export type CartView = NonNullable<Awaited<ReturnType<typeof getCart>>>;

export async function getCartCount() {
  const id = await currentCartId();
  if (!id) return 0;
  const agg = await db.cartItem.aggregate({ where: { cartId: id }, _sum: { quantity: true } });
  return agg._sum.quantity ?? 0;
}
