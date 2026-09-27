import type { OrderStatus } from "@/generated/prisma/client";

/** Carriers offered when marking an order as shipped. */
export const CARRIERS = ["پست پیشتاز", "پست سفارشی", "تیپاکس", "چاپار", "پیک آریزون یدک", "باربری", "تحویل حضوری"] as const;
/** Carriers that don't issue a tracking code. */
export const CARRIERS_WITHOUT_TRACKING: readonly string[] = ["پیک آریزون یدک", "تحویل حضوری"];

export const CANCEL_REASONS = ["اتمام موجودی کالا", "درخواست مشتری", "عدم پرداخت", "عدم پاسخگویی مشتری", "اشتباه در قیمت یا مشخصات", "سایر"] as const;
export const REFUND_REASONS = ["مرجوعی در مهلت ۷ روزه", "کالای معیوب یا مغایر", "گم شدن مرسوله", "لغو پس از پرداخت", "سایر"] as const;

/** Status changes an admin may make. Anything else is rejected on the server. */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "PROCESSING", "REFUNDED"],
  DELIVERED: ["REFUNDED", "SHIPPED"],
  CANCELLED: ["PROCESSING", "PAID"],
  REFUNDED: [],
};

/** Orders in these states hold their items' stock. */
export const holdsStock = (s: OrderStatus) => s !== "CANCELLED" && s !== "REFUNDED";

export type ActionKind = "plain" | "ship" | "cancel" | "refund" | "payment";
export type OrderAction = { to: OrderStatus; label: string; kind: ActionKind; primary?: boolean; danger?: boolean; hint: string };

/** The buttons shown for each status, in the order an admin normally uses them. */
export function actionsFor(status: OrderStatus, opts: { paidOnline: boolean; paymentMethod: "ONLINE" | "COD" }): OrderAction[] {
  switch (status) {
    case "PENDING_PAYMENT":
      return [
        { to: "PAID", label: "تأیید دریافت وجه", kind: "payment", primary: true, hint: "اگر مشتری مبلغ را کارت‌به‌کارت یا خارج از درگاه پرداخت کرده، ثبت کنید." },
        { to: "CANCELLED", label: "لغو سفارش", kind: "cancel", danger: true, hint: "موجودی کالاها به انبار برمی‌گردد." },
      ];
    case "PAID":
      return [
        { to: "PROCESSING", label: "شروع آماده‌سازی", kind: "plain", primary: true, hint: "سفارش را برای بسته‌بندی برمی‌دارید." },
        { to: "SHIPPED", label: "ثبت ارسال", kind: "ship", hint: "روش ارسال و کد رهگیری را وارد کنید." },
        { to: "CANCELLED", label: "لغو سفارش", kind: "cancel", danger: true, hint: "موجودی برمی‌گردد. بازگرداندن وجه را از پنل درگاه انجام دهید." },
      ];
    case "PROCESSING":
      return [
        { to: "SHIPPED", label: "ثبت ارسال", kind: "ship", primary: true, hint: "روش ارسال و کد رهگیری را وارد کنید." },
        { to: "DELIVERED", label: "تحویل شد (پیک / حضوری)", kind: "plain", hint: "اگر سفارش بدون پست و مستقیم تحویل داده شد." },
        { to: "CANCELLED", label: "لغو سفارش", kind: "cancel", danger: true, hint: "موجودی کالاها به انبار برمی‌گردد." },
      ];
    case "SHIPPED":
      return [
        { to: "DELIVERED", label: "تحویل شد", kind: "plain", primary: true, hint: "مرسوله به دست مشتری رسید." },
        { to: "PROCESSING", label: "برگشت به آماده‌سازی", kind: "plain", hint: "مثلاً اگر مرسوله برگشت خورد و باید دوباره ارسال شود." },
        { to: "REFUNDED", label: "مرجوع / بازپرداخت", kind: "refund", danger: true, hint: "کالاها به انبار برمی‌گردند." },
      ];
    case "DELIVERED":
      return [
        { to: "REFUNDED", label: "ثبت مرجوعی", kind: "refund", danger: true, hint: "کالا برگشت داده شد؛ موجودی به انبار برمی‌گردد." },
        { to: "SHIPPED", label: "اصلاح: هنوز تحویل نشده", kind: "plain", hint: "اگر وضعیت «تحویل شد» اشتباهی ثبت شده است." },
      ];
    case "CANCELLED":
      return [
        opts.paymentMethod === "ONLINE" && !opts.paidOnline
          ? { to: "PAID", label: "بازگشایی با تأیید پرداخت", kind: "payment", primary: true, hint: "اگر مشتری بعداً پرداخت کرده است. کالاها دوباره از موجودی کم می‌شوند." }
          : { to: "PROCESSING", label: "بازگشایی سفارش", kind: "plain", primary: true, hint: "کالاها دوباره از موجودی کم می‌شوند." },
      ];
    case "REFUNDED":
      return [];
  }
}

/** Customer-facing notification text for a status change. */
export function customerMessage(to: OrderStatus, ctx: { carrier?: string | null; trackingCode?: string | null; reason?: string | null }) {
  switch (to) {
    case "PAID":
      return "پرداخت سفارش شما تأیید شد و به‌زودی آماده ارسال می‌شود.";
    case "PROCESSING":
      return "سفارش شما در حال آماده‌سازی و بسته‌بندی است.";
    case "SHIPPED":
      return `سفارش شما${ctx.carrier ? ` با ${ctx.carrier}` : ""} ارسال شد.${ctx.trackingCode ? ` کد رهگیری: ${ctx.trackingCode}` : ""}`;
    case "DELIVERED":
      return "سفارش شما تحویل شد. از خرید شما سپاسگزاریم.";
    case "CANCELLED":
      return `سفارش شما لغو شد.${ctx.reason ? ` علت: ${ctx.reason}` : ""}`;
    case "REFUNDED":
      return `مرجوعی سفارش شما ثبت شد.${ctx.reason ? ` علت: ${ctx.reason}` : ""}`;
    default:
      return "وضعیت سفارش شما تغییر کرد.";
  }
}
