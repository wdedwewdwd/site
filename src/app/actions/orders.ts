"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { ensureCartId } from "@/lib/cart";
import { faDigits } from "@/lib/format";
import { CUSTOMER_CANCEL_NOTE } from "@/lib/order-flow";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { MAX_QTY_PER_ITEM } from "@/lib/shop";
import { idSchema } from "@/lib/validation";

type Result = { ok: true; message: string } | { ok: false; error: string };

/**
 * The customer cancels their own order while it is still unpaid; its stock goes back on sale. A paid order is
 * cancelled only by staff (the money has to be returned). If the payment lands at the same moment, the payment
 * callback finds the order cancelled and reopens it as a late payment.
 */
export async function cancelMyOrder(orderId: string): Promise<Result> {
  const user = await requireUser("/profile/orders");
  if (!idSchema.safeParse(orderId).success) return { ok: false, error: "درخواست نامعتبر است." };
  const rl = await rateLimit(`order-cancel:${user.id}`, 10, 600);
  if (!rl.ok) return { ok: false, error: "تعداد درخواست‌ها زیاد است؛ چند دقیقه دیگر امتحان کنید." };

  const order = await db.order.findFirst({ where: { id: orderId, userId: user.id }, select: { id: true, number: true, status: true } });
  if (!order) return { ok: false, error: "سفارش یافت نشد." };
  if (order.status !== "PENDING_PAYMENT") {
    return { ok: false, error: "فقط سفارش پرداخت‌نشده را خودتان می‌توانید لغو کنید. برای لغو این سفارش با پشتیبانی تماس بگیرید." };
  }

  const cancelled = await db.$transaction(async (tx) => {
    // Conditional update: if the payment was confirmed a moment ago, nothing changes.
    const res = await tx.order.updateMany({ where: { id: order.id, userId: user.id, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED" } });
    if (res.count === 0) return false;
    const items = await tx.orderItem.findMany({ where: { orderId: order.id, productId: { not: null } } });
    for (const i of items) await tx.product.update({ where: { id: i.productId! }, data: { stock: { increment: i.quantity } } });
    await tx.orderEvent.create({ data: { orderId: order.id, status: "CANCELLED", note: CUSTOMER_CANCEL_NOTE } });
    return true;
  });
  if (!cancelled) return { ok: false, error: "وضعیت این سفارش همین الان تغییر کرد؛ صفحه را تازه کنید." };

  await db.auditLog.create({ data: { actorId: user.id, action: "order.cancel_by_customer", entity: "Order", entityId: order.id, ip: await clientIp() } });
  revalidatePath("/profile", "layout");
  revalidatePath("/admin/orders");
  return { ok: true, message: `سفارش #${faDigits(order.number)} لغو شد.` };
}

/** Puts an order's items back in the cart, as many as are in stock now, to buy the same parts again. */
export async function reorder(orderId: string): Promise<Result> {
  const user = await requireUser("/profile/orders");
  if (!idSchema.safeParse(orderId).success) return { ok: false, error: "درخواست نامعتبر است." };
  const rl = await rateLimit(`reorder:${user.id}`, 20, 600);
  if (!rl.ok) return { ok: false, error: "تعداد درخواست‌ها زیاد است؛ چند دقیقه دیگر امتحان کنید." };

  const order = await db.order.findFirst({ where: { id: orderId, userId: user.id }, select: { items: { select: { productId: true, quantity: true } } } });
  if (!order) return { ok: false, error: "سفارش یافت نشد." };

  const wanted = new Map<string, number>();
  for (const i of order.items) if (i.productId) wanted.set(i.productId, (wanted.get(i.productId) ?? 0) + i.quantity);
  const available = await db.product.findMany({ where: { id: { in: [...wanted.keys()] }, isActive: true, stock: { gt: 0 } }, select: { id: true, stock: true } });
  if (available.length === 0) return { ok: false, error: "هیچ‌کدام از کالاهای این سفارش الان موجود نیست." };

  const cartId = await ensureCartId();
  const existing = await db.cartItem.findMany({ where: { cartId, productId: { in: available.map((p) => p.id) } } });
  const inCart = new Map(existing.map((i) => [i.productId, i.quantity]));
  let short = false;
  for (const p of available) {
    const want = (inCart.get(p.id) ?? 0) + wanted.get(p.id)!;
    const quantity = Math.min(want, p.stock, MAX_QTY_PER_ITEM);
    if (quantity < want) short = true;
    await db.cartItem.upsert({
      where: { cartId_productId: { cartId, productId: p.id } },
      create: { cartId, productId: p.id, quantity },
      update: { quantity },
    });
  }
  revalidatePath("/", "layout");

  // Lines whose product was deleted, plus products that are hidden or out of stock now.
  const missing = order.items.filter((i) => !i.productId).length + wanted.size - available.length;
  if (missing > 0) return { ok: true, message: `${faDigits(available.length)} کالا به سبد خرید اضافه شد؛ ${faDigits(missing)} کالا الان موجود نیست.` };
  return { ok: true, message: short ? "کالاها به سبد خرید اضافه شد؛ تعداد بعضی از آن‌ها به اندازهٔ موجودی کم شد." : "کالاهای این سفارش به سبد خرید اضافه شد." };
}
