"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { ORDER_STATUS } from "@/lib/shop";
import { idSchema, text } from "@/lib/validation";
import type { OrderStatus } from "@/generated/prisma/client";

export type OrderUpdateState = { ok: boolean; error?: string; message?: string } | null;

// Allowed forward transitions. Anything else is rejected server-side.
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

const schema = z.object({
  orderId: idSchema,
  status: z.enum(Object.keys(ORDER_STATUS) as [OrderStatus, ...OrderStatus[]]),
  trackingCode: z.union([z.literal(""), z.string().trim().regex(/^[A-Za-z0-9-]{4,40}$/, "کد رهگیری معتبر نیست")]),
  note: z.union([z.literal(""), text(300)]),
});

export async function updateOrder(_: OrderUpdateState, formData: FormData): Promise<OrderUpdateState> {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { orderId, status, trackingCode, note } = parsed.data;

  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return { ok: false, error: "سفارش یافت نشد." };

  const statusChanged = status !== order.status;
  if (statusChanged && !TRANSITIONS[order.status].includes(status))
    return { ok: false, error: `تغییر وضعیت از «${ORDER_STATUS[order.status].label}» به «${ORDER_STATUS[status].label}» مجاز نیست.` };
  if (status === "SHIPPED" && !trackingCode && !order.trackingCode) return { ok: false, error: "برای وضعیت «در حال ارسال» کد رهگیری الزامی است." };
  if (status === "REFUNDED" && staff.role !== "ADMIN") return { ok: false, error: "فقط مدیر می‌تواند سفارش را مرجوع کند." };

  const applied = await db.$transaction(async (tx) => {
    // Optimistic concurrency: the update only applies if nobody changed the status meanwhile.
    const res = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status, ...(trackingCode ? { trackingCode } : {}) },
    });
    if (res.count === 0) throw new Error("conflict");
    if (statusChanged) {
      await tx.orderEvent.create({ data: { orderId: order.id, status, note: note || null } });
      // Return reserved stock when an order is cancelled or refunded.
      if (status === "CANCELLED" || status === "REFUNDED") {
        for (const i of order.items) if (i.productId) await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } });
      }
      await tx.notification.create({
        data: {
          userId: order.userId,
          title: `سفارش #${order.number}: ${ORDER_STATUS[status].label}`,
          body: status === "SHIPPED" ? `سفارش شما ارسال شد. کد رهگیری: ${trackingCode || order.trackingCode}` : `وضعیت سفارش شما به «${ORDER_STATUS[status].label}» تغییر کرد.`,
          href: `/profile/orders/${order.number}`,
        },
      });
    }
    return true;
  }).catch((e: Error) => {
    if (e.message === "conflict") return false;
    throw e;
  });
  if (!applied) return { ok: false, error: "این سفارش هم‌زمان توسط کاربر دیگری تغییر کرد. صفحه را تازه کنید." };

  await audit(staff.id, "order.update", "Order", order.id, { from: order.status, to: status, trackingCode: trackingCode || undefined });
  revalidatePath(`/admin/orders/${order.number}`);
  revalidatePath("/admin/orders");
  return { ok: true, message: "سفارش به‌روزرسانی شد." };
}
