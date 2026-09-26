"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { evaluateDiscount, getCart } from "@/lib/cart";
import { beginOnlinePayment, expireStaleOrders, PAYMENT_WINDOW_MIN } from "@/lib/orders";
import { onlinePaymentEnabled } from "@/lib/payment";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { SHIPPING } from "@/lib/shop";
import { idSchema } from "@/lib/validation";

type Result = { ok: false; error: string };

const placeSchema = z.object({
  addressId: idSchema,
  shipping: z.enum(["EXPRESS", "POST"]),
  payment: z.enum(["ONLINE", "COD"]),
});

class CheckoutError extends Error {}

export async function placeOrder(input: z.input<typeof placeSchema>): Promise<Result> {
  const user = await requireUser("/checkout");
  const parsed = placeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "اطلاعات سفارش نامعتبر است." };
  const { addressId, shipping, payment } = parsed.data;
  if (payment === "ONLINE" && !onlinePaymentEnabled()) return { ok: false, error: "پرداخت آنلاین در حال حاضر فعال نیست." };

  const rl = await rateLimit(`checkout:${user.id}`, 10, 600);
  if (!rl.ok) return { ok: false, error: "تعداد درخواست‌ها زیاد است. چند دقیقه دیگر تلاش کنید." };

  await expireStaleOrders();

  const [cart, address] = await Promise.all([
    getCart(),
    db.address.findFirst({ where: { id: addressId, userId: user.id } }),
  ]);
  if (!cart || cart.items.length === 0) return { ok: false, error: "سبد خرید شما خالی است." };
  if (!address) return { ok: false, error: "آدرس انتخاب شده معتبر نیست." };
  if (shipping === "EXPRESS" && address.province !== "تهران")
    return { ok: false, error: "ارسال سریع فقط برای تهران امکان‌پذیر است." };

  let order: { id: string; number: number; total: number };
  try {
    order = await db.$transaction(async (tx) => {
      // Re-read prices inside the transaction; the client never supplies prices.
      const products = await tx.product.findMany({
        where: { id: { in: cart.items.map((i) => i.productId) }, isActive: true },
        select: { id: true, name: true, sku: true, price: true },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      for (const item of cart.items) {
        const p = byId.get(item.productId);
        if (!p) throw new CheckoutError("یکی از کالاهای سبد خرید دیگر فروخته نمی‌شود.");
        // Atomic stock reservation: fails if someone else bought the last units.
        const reserved = await tx.product.updateMany({
          where: { id: p.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (reserved.count === 0) throw new CheckoutError(`موجودی «${p.name}» کافی نیست.`);
        subtotal += p.price * item.quantity;
      }

      let discount = 0;
      let discountCode: string | null = null;
      if (cart.discountCode) {
        const code = await tx.discountCode.findUnique({ where: { code: cart.discountCode } });
        const check = evaluateDiscount(code, subtotal);
        if (!check.ok) throw new CheckoutError(check.error);
        const claimed = await tx.discountCode.updateMany({
          where: { id: check.code.id, ...(check.code.maxUses !== null ? { usedCount: { lt: check.code.maxUses } } : {}) },
          data: { usedCount: { increment: 1 } },
        });
        if (claimed.count === 0) throw new CheckoutError("ظرفیت کد تخفیف تمام شده است.");
        discount = check.amount;
        discountCode = check.code.code;
      }

      const shippingCost = SHIPPING[shipping].price;
      const total = subtotal - discount + shippingCost;
      const initialStatus = payment === "COD" ? "PROCESSING" : "PENDING_PAYMENT";

      const created = await tx.order.create({
        data: {
          userId: user.id,
          status: initialStatus,
          paymentMethod: payment,
          shippingMethod: shipping,
          subtotal,
          discount,
          discountCode,
          shippingCost,
          total,
          receiverName: address.receiverName,
          receiverPhone: address.receiverPhone,
          province: address.province,
          city: address.city,
          postalCode: address.postalCode,
          fullAddress: address.fullAddress,
          items: {
            create: cart.items.map((i) => {
              const p = byId.get(i.productId)!;
              return { productId: p.id, name: p.name, sku: p.sku, unitPrice: p.price, quantity: i.quantity };
            }),
          },
          events: { create: { status: initialStatus, note: payment === "COD" ? "ثبت سفارش با پرداخت در محل" : "ثبت سفارش" } },
        },
        select: { id: true, number: true, total: true },
      });

      await tx.cart.update({ where: { id: cart.id }, data: { discountCode: null, items: { deleteMany: {} } } });
      return created;
    });
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    throw e;
  }

  await db.auditLog.create({
    data: { actorId: user.id, action: "order.create", entity: "Order", entityId: order.id, ip: await clientIp() },
  });
  revalidatePath("/", "layout");

  if (payment === "COD") {
    await db.notification.create({
      data: { userId: user.id, title: `سفارش #${order.number} ثبت شد`, body: "سفارش شما ثبت شد و در حال آماده‌سازی است.", href: `/profile/orders/${order.number}` },
    });
    redirect(`/checkout/result/${order.number}`);
  }

  const pay = await beginOnlinePayment(order, user.phone);
  if (!pay.ok) redirect(`/profile/orders/${order.number}?pay=failed`);
  redirect(pay.redirectUrl);
}

export async function retryPayment(orderId: string): Promise<Result> {
  const user = await requireUser("/profile/orders");
  if (!idSchema.safeParse(orderId).success) return { ok: false, error: "درخواست نامعتبر است." };
  const rl = await rateLimit(`pay-retry:${user.id}`, 10, 600);
  if (!rl.ok) return { ok: false, error: "تعداد درخواست‌ها زیاد است." };

  await expireStaleOrders();
  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id, status: "PENDING_PAYMENT", paymentMethod: "ONLINE" },
    select: { id: true, number: true, total: true, createdAt: true },
  });
  if (!order) return { ok: false, error: `مهلت پرداخت این سفارش (${PAYMENT_WINDOW_MIN} دقیقه) به پایان رسیده است.` };

  const pay = await beginOnlinePayment(order, user.phone);
  if (!pay.ok) return { ok: false, error: pay.error };
  redirect(pay.redirectUrl);
}
