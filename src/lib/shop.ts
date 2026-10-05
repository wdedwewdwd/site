import type { OrderStatus } from "@/generated/prisma/client";

export const SITE = {
  name: "آریزون یدک",
  latinName: "Arizon Yadak Auto Parts",
  description:
    "آریزون یدک، مرجع تخصصی تامین و توزیع قطعات یدکی انواع خودروهای داخلی و خارجی. ضمانت اصالت کالا، بهترین قیمت بازار و ارسال سریع به سراسر کشور.",
} as const;

// Phone numbers, address, hours and social links are editable in the admin panel: see getContact().

export const MAX_QTY_PER_ITEM = 20;

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "green" | "amber" | "red" | "blue" | "gray" }> = {
  PENDING_PAYMENT: { label: "در انتظار پرداخت", tone: "red" },
  PAID: { label: "پرداخت شده", tone: "blue" },
  PROCESSING: { label: "در حال آماده‌سازی", tone: "amber" },
  SHIPPED: { label: "در حال ارسال", tone: "amber" },
  DELIVERED: { label: "تحویل شده", tone: "green" },
  CANCELLED: { label: "لغو شده", tone: "gray" },
  REFUNDED: { label: "مرجوع شده", tone: "gray" },
};

export const TICKET_CATEGORIES = ["پیگیری سفارش", "مرجوعی و بازگشت کالا", "مشاوره خرید قطعه", "پرداخت", "شکایت", "سایر"] as const;

export const TICKET_STATUS = {
  OPEN: { label: "در انتظار پاسخ", cls: "bg-warning-soft text-warning" },
  ANSWERED: { label: "پاسخ داده شده", cls: "bg-success-soft text-success" },
  CLOSED: { label: "بسته شده", cls: "bg-surface text-muted" },
} as const;

/** Icon names an admin may assign to a category (see components/ui/CategoryIcon). */
export const CATEGORY_ICON_NAMES = ["wind", "droplet", "battery", "disc", "circle-dot", "settings", "cog", "lightbulb", "wrench", "car"] as const;

/** Persian labels shown to admins when picking a category icon. */
export const CATEGORY_ICON_LABELS: Record<(typeof CATEGORY_ICON_NAMES)[number], string> = {
  wind: "فیلتر / هوا",
  droplet: "روغن / مایعات",
  battery: "برق / باتری",
  disc: "ترمز / دیسک",
  "circle-dot": "جلوبندی / تعلیق",
  settings: "گیربکس / کلاچ",
  cog: "موتور",
  lightbulb: "چراغ / لامپ",
  wrench: "عمومی / ابزار",
  car: "بدنه / خودرو",
};
