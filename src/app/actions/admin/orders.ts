"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { PROVINCES } from "@/lib/iran";
import { CANCEL_REASONS, CARRIERS, CARRIERS_WITHOUT_TRACKING, countsAsSold, customerMessage, holdsStock, REFUND_REASONS, TRANSITIONS } from "@/lib/order-flow";
import { ORDER_STATUS } from "@/lib/shop";
import { idSchema, optionalPostalCodeSchema, phoneSchema, text, toEnDigits } from "@/lib/validation";
import type { OrderStatus } from "@/generated/prisma/client";

export type OrderActionState = { ok: boolean; message: string } | null;

class OrderError extends Error {}

function refresh(number: number) {
  revalidatePath(`/admin/orders/${number}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

const optional = (max: number) => z.union([z.literal(""), text(max)]).optional().transform((v) => v || null);

const changeSchema = z.object({
  orderId: idSchema,
  to: z.enum(Object.keys(ORDER_STATUS) as [OrderStatus, ...OrderStatus[]]),
  carrier: z.union([z.literal(""), z.enum(CARRIERS)]).optional(),
  trackingCode: z
    .string()
    .optional()
    .transform((v) => toEnDigits(v ?? "").trim())
    .pipe(z.union([z.literal(""), z.string().regex(/^[A-Za-z0-9-]{4,40}$/, "کد رهگیری فقط عدد و حروف انگلیسی (۴ تا ۴۰ کاراکتر)")])),
  reason: z.union([z.literal(""), z.enum([...CANCEL_REASONS, ...REFUND_REASONS])]).optional(),
  reference: optional(80),
  note: optional(500),
  notify: z.string().optional(),
  codCollected: z.string().optional(),
});

/** Changes an order's status with the side effects each step needs (stock, payment record, customer notice). */
export async function changeOrderStatus(_: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  const parsed = changeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { orderId, to, carrier, trackingCode, reason, reference, note, notify, codCollected } = parsed.data;

  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true, payments: { where: { status: "SUCCEEDED" } } } });
  if (!order) return { ok: false, message: "سفارش یافت نشد." };
  const from = order.status;
  if (!TRANSITIONS[from].includes(to)) {
    return { ok: false, message: `تغییر از «${ORDER_STATUS[from].label}» به «${ORDER_STATUS[to].label}» مجاز نیست.` };
  }
  if (to === "REFUNDED" && staff.role !== "ADMIN") return { ok: false, message: "فقط مدیر می‌تواند مرجوعی ثبت کند." };
  if (to === "SHIPPED") {
    if (!carrier) return { ok: false, message: "روش ارسال را انتخاب کنید." };
    if (!trackingCode && !CARRIERS_WITHOUT_TRACKING.includes(carrier)) return { ok: false, message: `برای «${carrier}» کد رهگیری را وارد کنید.` };
  }
  if ((to === "CANCELLED" || to === "REFUNDED") && !reason) return { ok: false, message: "علت را انتخاب کنید." };

  const needsPaymentRecord = to === "PAID" && order.payments.length === 0;
  // Delivering a cash-on-delivery order can record the collected cash in the same step.
  const collectCod = to === "DELIVERED" && codCollected === "on" && order.paymentMethod === "COD" && order.payments.length === 0;
  const eventNote = [
    reason,
    collectCod ? "وجه در محل دریافت شد" : null,
    reference ? `مرجع پرداخت: ${reference}` : null,
    to === "SHIPPED" ? [carrier, trackingCode].filter(Boolean).join(" — ") : null,
    note,
  ]
    .filter(Boolean)
    .join(" | ") || null;

  try {
    await db.$transaction(async (tx) => {
      // Optimistic concurrency: nobody else changed the status in the meantime.
      const res = await tx.order.updateMany({
        where: { id: order.id, status: from },
        data: {
          status: to,
          ...(to === "SHIPPED" ? { carrier, trackingCode: trackingCode || null } : {}),
          ...((to === "PAID" || collectCod) && !order.paidAt ? { paidAt: new Date() } : {}),
        },
      });
      if (res.count === 0) throw new OrderError("این سفارش هم‌زمان تغییر کرد؛ صفحه را تازه کنید.");

      // Stock follows the order: released on cancel/refund, re-reserved when reopened.
      // Sales counts follow it too: counted once confirmed, taken back on cancel/refund.
      const release = holdsStock(from) && !holdsStock(to);
      const reserve = !holdsStock(from) && holdsStock(to);
      const sold = countsAsSold(to) === countsAsSold(from) ? 0 : countsAsSold(to) ? 1 : -1;
      for (const i of order.items) {
        if (!i.productId) continue;
        if (release) await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } });
        if (reserve) {
          const ok = await tx.product.updateMany({ where: { id: i.productId, stock: { gte: i.quantity } }, data: { stock: { decrement: i.quantity } } });
          if (ok.count === 0) throw new OrderError(`موجودی «${i.name}» برای بازگشایی سفارش کافی نیست.`);
        }
        if (sold > 0) await tx.product.update({ where: { id: i.productId }, data: { soldCount: { increment: i.quantity } } });
        // Orders placed before sales were counted this way never added to soldCount; don't go below zero.
        if (sold < 0) await tx.$executeRaw`UPDATE "Product" SET "soldCount" = GREATEST("soldCount" - ${i.quantity}, 0) WHERE "id" = ${i.productId}`;
      }

      if (needsPaymentRecord || collectCod) {
        await tx.payment.create({
          data: { orderId: order.id, gateway: collectCod ? "cod" : "manual", amount: order.total, status: "SUCCEEDED", refId: reference, verifiedAt: new Date() },
        });
      }
      await tx.orderEvent.create({ data: { orderId: order.id, status: to, note: eventNote, actorId: staff.id } });
      if (notify === "on") {
        await tx.notification.create({
          data: {
            userId: order.userId,
            title: `سفارش #${order.number}: ${ORDER_STATUS[to].label}`,
            body: customerMessage(to, { carrier, trackingCode, reason }),
            href: `/profile/orders/${order.number}`,
          },
        });
      }
    });
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, message: e.message };
    throw e;
  }

  await audit(staff.id, "order.status", "Order", order.id, { from, to, carrier, trackingCode: trackingCode || undefined, reason });
  if (collectCod) await audit(staff.id, "order.cod_paid", "Order", order.id, { amount: order.total });
  refresh(order.number);
  return { ok: true, message: `وضعیت به «${ORDER_STATUS[to].label}» تغییر کرد.` };
}

const codSchema = z.object({ orderId: idSchema, reference: optional(80) });

/** Records that the courier collected the cash-on-delivery amount. */
export async function recordCodPayment(_: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  const parsed = codSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "درخواست نامعتبر است." };
  const order = await db.order.findUnique({ where: { id: parsed.data.orderId }, include: { payments: { where: { status: "SUCCEEDED" } } } });
  if (!order) return { ok: false, message: "سفارش یافت نشد." };
  if (order.paymentMethod !== "COD") return { ok: false, message: "این سفارش پرداخت در محل نیست." };
  if (order.payments.length) return { ok: false, message: "پرداخت این سفارش قبلاً ثبت شده است." };
  if (!holdsStock(order.status)) return { ok: false, message: "سفارش لغو یا مرجوع شده است." };

  const ref = parsed.data.reference;
  await db.$transaction([
    db.payment.create({ data: { orderId: order.id, gateway: "cod", amount: order.total, status: "SUCCEEDED", refId: ref, verifiedAt: new Date() } }),
    db.order.update({ where: { id: order.id }, data: { paidAt: new Date() } }),
    db.orderEvent.create({ data: { orderId: order.id, status: order.status, note: `دریافت وجه در محل ثبت شد${ref ? ` | مرجع: ${ref}` : ""}`, actorId: staff.id } }),
  ]);
  await audit(staff.id, "order.cod_paid", "Order", order.id, { amount: order.total });
  refresh(order.number);
  return { ok: true, message: "دریافت وجه در محل ثبت شد." };
}

const shippingSchema = z.object({
  orderId: idSchema,
  receiverName: text(80, 3),
  receiverPhone: phoneSchema,
  province: z.enum(PROVINCES, "استان را انتخاب کنید"),
  city: text(50, 2),
  postalCode: optionalPostalCodeSchema,
  fullAddress: text(300, 10),
});

/** Corrects the delivery details (e.g. adding the postal code after calling the customer). */
export async function updateShippingInfo(_: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  const parsed = shippingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { orderId, ...data } = parsed.data;
  const order = await db.order.findUnique({ where: { id: orderId }, select: { number: true } });
  if (!order) return { ok: false, message: "سفارش یافت نشد." };
  await db.order.update({ where: { id: orderId }, data });
  await audit(staff.id, "order.shipping_edit", "Order", orderId);
  refresh(order.number);
  return { ok: true, message: "اطلاعات ارسال ذخیره شد." };
}

const noteSchema = z.object({ orderId: idSchema, adminNote: z.union([z.literal(""), text(2000)]) });

/** Private staff note; never shown to the customer. */
export async function saveAdminNote(_: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  const parsed = noteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const order = await db.order.update({ where: { id: parsed.data.orderId }, data: { adminNote: parsed.data.adminNote || null }, select: { number: true } }).catch(() => null);
  if (!order) return { ok: false, message: "سفارش یافت نشد." };
  await audit(staff.id, "order.note", "Order", parsed.data.orderId);
  refresh(order.number);
  return { ok: true, message: "یادداشت ذخیره شد." };
}
