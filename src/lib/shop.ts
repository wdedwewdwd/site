import type { OrderStatus, ShippingMethod } from "@/generated/prisma/client";

export const SITE: {
  name: string;
  latinName: string;
  description: string;
  supportPhone: string;
  supportPhoneTel: string;
  supportMobile: string;
  supportMobileTel: string;
  supportHours: string;
  email: string;
  address: string;
  postalCode: string;
} = {
  name: "آریزون یدک",
  latinName: "Arizon Yadak Auto Parts",
  description:
    "آریزون یدک، مرجع تخصصی تامین و توزیع قطعات یدکی انواع خودروهای داخلی و خارجی. ضمانت اصالت کالا، بهترین قیمت بازار و ارسال سریع به سراسر کشور.",
  // These must exactly match the details registered with eNamad.
  supportPhone: "۰۲۱-۳۳۹۴۷۲۷۰",
  supportPhoneTel: "02133947270",
  supportMobile: "۰۹۱۲۲۰۵۴۸۳۹",
  supportMobileTel: "09122054839",
  supportHours: "۷ روز هفته، ۲۴ ساعته",
  // Empty values are hidden on the site until they are filled in.
  email: "",
  address: "تهران، خیابان امیرکبیر، پاساژ کاشانی، طبقه همکف، پلاک ۱۱۰",
  postalCode: "",
};

/** Address followed by the postal code when one is set. */
export const SITE_ADDRESS = SITE.postalCode ? `${SITE.address} — کد پستی: ${SITE.postalCode}` : SITE.address;

export const MAX_QTY_PER_ITEM = 20;

export const SHIPPING: Record<ShippingMethod, { title: string; description: string; price: number }> = {
  EXPRESS: {
    title: "ارسال سریع (۱-۲ روز کاری)",
    description: "تحویل با پیک اختصاصی آریزون یدک (مخصوص تهران)",
    price: 85_000,
  },
  POST: {
    title: "ارسال عادی پست پیشتاز (۳-۴ روز کاری)",
    description: "تحویل توسط اداره پست جمهوری اسلامی ایران",
    price: 45_000,
  },
};

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
