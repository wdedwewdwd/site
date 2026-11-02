import "server-only";
import { db } from "./db";
import { PAGE_VIEW_RETENTION_DAYS } from "./analytics";
import { env } from "./env";
import { AUTO_CANCEL_NOTE } from "./order-flow";
import { startPayment } from "./payment";

/** Unpaid online orders hold stock for this long before being cancelled. */
export const PAYMENT_WINDOW_MIN = 30;

/** Seconds left to pay an order placed at `createdAt` (zero or less once the window has passed). */
export const paymentSecondsLeft = (createdAt: Date) => Math.round((createdAt.getTime() + PAYMENT_WINDOW_MIN * 60_000 - Date.now()) / 1000);

/** Cancels abandoned online orders and returns their reserved stock. */
export async function expireStaleOrders() {
  const cutoff = new Date(Date.now() - PAYMENT_WINDOW_MIN * 60 * 1000);
  const stale = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", paymentMethod: "ONLINE", createdAt: { lt: cutoff } },
    select: { id: true },
    take: 100,
  });
  for (const { id } of stale) {
    await db.$transaction(async (tx) => {
      // Conditional update: only one process can win the transition.
      const res = await tx.order.updateMany({ where: { id, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED" } });
      if (res.count === 0) return;
      const items = await tx.orderItem.findMany({ where: { orderId: id, productId: { not: null } } });
      for (const i of items) await tx.product.update({ where: { id: i.productId! }, data: { stock: { increment: i.quantity } } });
      await tx.orderEvent.create({ data: { orderId: id, status: "CANCELLED", note: AUTO_CANCEL_NOTE } });
    });
  }
}

/** Deletes expired sessions, used OTP codes and stale rate-limit windows. */
export async function housekeeping() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await Promise.all([
    db.pageView.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - PAGE_VIEW_RETENTION_DAYS * 24 * 60 * 60 * 1000) } } }),
    db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    db.otpCode.deleteMany({ where: { createdAt: { lt: dayAgo } } }),
    db.rateLimit.deleteMany({ where: { windowStart: { lt: dayAgo } } }),
  ]);
}

/** Creates a gateway transaction for an order and returns the redirect URL. */
export async function beginOnlinePayment(order: { id: string; number: number; total: number }, mobile: string) {
  const res = await startPayment({
    amountToman: order.total,
    description: `پرداخت سفارش شماره ${order.number} آریزون یدک`,
    callbackUrl: new URL("/payment/callback", env.APP_URL).toString(),
    mobile,
  });
  if (!res.ok) return res;
  await db.payment.create({
    data: { orderId: order.id, gateway: env.PAYMENT_PROVIDER, amount: order.total, authority: res.authority },
  });
  return res;
}
