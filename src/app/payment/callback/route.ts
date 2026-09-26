import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyPayment } from "@/lib/payment";

export const dynamic = "force-dynamic";

const to = (path: string) => NextResponse.redirect(new URL(path, env.APP_URL), 303);

/**
 * Gateway return URL. Nothing in the query string is trusted except the
 * authority, which we look up in our own database; the amount always comes
 * from the stored order and is re-verified server-to-server with the gateway.
 */
export async function GET(req: NextRequest) {
  const authority = req.nextUrl.searchParams.get("Authority") ?? req.nextUrl.searchParams.get("authority") ?? "";
  const status = req.nextUrl.searchParams.get("Status") ?? req.nextUrl.searchParams.get("status");
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(authority)) return to("/");

  const payment = await db.payment.findUnique({
    where: { authority },
    include: { order: { select: { id: true, number: true, total: true, userId: true, status: true } } },
  });
  if (!payment) return to("/");
  const result = `/checkout/result/${payment.order.number}`;

  if (payment.status === "SUCCEEDED") return to(result); // idempotent refresh
  if (payment.status === "FAILED" || status !== "OK") {
    await db.payment.updateMany({ where: { id: payment.id, status: "INITIATED" }, data: { status: "FAILED" } });
    return to(`${result}?status=failed`);
  }

  const verified = await verifyPayment(authority, payment.amount);
  if (!verified.ok || payment.amount !== payment.order.total) {
    await db.payment.updateMany({ where: { id: payment.id, status: "INITIATED" }, data: { status: "FAILED" } });
    return to(`${result}?status=failed`);
  }

  await db.$transaction(async (tx) => {
    const won = await tx.payment.updateMany({
      where: { id: payment.id, status: "INITIATED" },
      data: { status: "SUCCEEDED", refId: verified.refId, cardPan: verified.cardPan, verifiedAt: new Date() },
    });
    if (won.count === 0) return; // another request already processed this callback

    const order = payment.order;
    // Re-read inside the transaction: the order may have been auto-cancelled meanwhile.
    // FOR UPDATE serializes this with the auto-cancel job, which updates the same row.
    const [current] = await tx.$queryRaw<{ status: string }[]>`SELECT "status" FROM "Order" WHERE "id" = ${order.id} FOR UPDATE`;
    const late = current?.status === "CANCELLED";
    await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date() } });
    const items = await tx.orderItem.findMany({ where: { orderId: order.id, productId: { not: null } } });
    for (const i of items) {
      await tx.product.update({
        where: { id: i.productId! },
        // A late payment after auto-cancel re-reserves the stock that was released.
        data: { soldCount: { increment: i.quantity }, ...(late ? { stock: { decrement: i.quantity } } : {}) },
      });
    }
    await tx.orderEvent.create({
      data: { orderId: order.id, status: "PAID", note: late ? "پرداخت پس از لغو خودکار — بررسی موجودی توسط مدیر" : `پرداخت موفق — کد پیگیری ${verified.refId}` },
    });
    await tx.notification.create({
      data: {
        userId: order.userId,
        title: `پرداخت سفارش #${order.number} موفق بود`,
        body: `کد پیگیری پرداخت: ${verified.refId}. سفارش شما در حال آماده‌سازی است.`,
        href: `/profile/orders/${order.number}`,
      },
    });
  });

  return to(result);
}
