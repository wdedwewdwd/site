import { z } from "zod";
import type { ShippingMethod } from "@/generated/prisma/client";

/**
 * Shipping methods offered at checkout. The set is fixed (each one has its own rules), but the owner edits
 * every method's title, description, price and on/off switch at /admin/shipping (Setting `shipping_config`).
 * Safe to import from client components.
 */
export const SHIPPING_METHODS = ["POST", "TIPAX", "EXPRESS", "FREIGHT", "PICKUP"] as const satisfies readonly ShippingMethod[];

/** fixed = a set price · collect = «پس‌کرایه», the customer pays the carrier on delivery · free. */
export const PRICING_MODES = ["fixed", "collect", "free"] as const;
export type PricingMode = (typeof PRICING_MODES)[number];

export type ShippingOption = {
  enabled: boolean;
  title: string;
  description: string;
  pricing: PricingMode;
  /** Toman; used when pricing is "fixed". */
  price: number;
  /** Free when the order (after discount) reaches this many toman; null = never. */
  freeOver: number | null;
  /** Only for addresses in Tehran province (e.g. the shop's own courier). */
  tehranOnly: boolean;
};

export type ShippingConfig = { order: ShippingMethod[]; methods: Record<ShippingMethod, ShippingOption> };

/** What a method is, for the admin page; the customer only sees the editable title and description. */
export const METHOD_INFO: Record<ShippingMethod, { label: string; note: string }> = {
  POST: { label: "پست", note: "ارسال با اداره پست به سراسر کشور" },
  TIPAX: { label: "تیپاکس", note: "ارسال درب منزل با تیپاکس" },
  EXPRESS: { label: "پیک", note: "پیک موتوری فروشگاه، معمولاً فقط داخل تهران" },
  FREIGHT: { label: "باربری", note: "برای قطعات حجیم و سنگین (گیربکس، موتور، سپر…)" },
  PICKUP: { label: "تحویل حضوری", note: "مشتری سفارش را از فروشگاه تحویل می‌گیرد؛ نیازی به نشانی ندارد" },
};

export const SHIPPING_DEFAULTS: ShippingConfig = {
  order: ["POST", "TIPAX", "EXPRESS", "FREIGHT", "PICKUP"],
  methods: {
    POST: {
      enabled: true,
      title: "پست پیشتاز",
      description: "تحویل ۳ تا ۵ روز کاری توسط اداره پست، به سراسر کشور",
      pricing: "fixed",
      price: 45_000,
      freeOver: null,
      tehranOnly: false,
    },
    TIPAX: {
      enabled: true,
      title: "تیپاکس",
      description: "تحویل ۱ تا ۳ روز کاری درب منزل؛ کرایه هنگام تحویل به مأمور تیپاکس پرداخت می‌شود",
      pricing: "collect",
      price: 0,
      freeOver: null,
      tehranOnly: false,
    },
    EXPRESS: {
      enabled: true,
      title: "پیک موتوری (تهران)",
      description: "ارسال همان روز یا روز بعد با پیک آریزون یدک",
      pricing: "fixed",
      price: 85_000,
      freeOver: null,
      tehranOnly: true,
    },
    FREIGHT: {
      enabled: true,
      title: "باربری (قطعات حجیم)",
      description: "مناسب قطعات بزرگ و سنگین؛ تحویل در باربری شهر شما و پرداخت کرایه هنگام تحویل",
      pricing: "collect",
      price: 0,
      freeOver: null,
      tehranOnly: false,
    },
    PICKUP: {
      enabled: true,
      title: "تحویل حضوری از فروشگاه",
      description: "پس از آماده شدن سفارش با شما تماس می‌گیریم تا از فروشگاه تحویل بگیرید",
      pricing: "free",
      price: 0,
      freeOver: null,
      tehranOnly: false,
    },
  },
};

const MAX_PRICE = 50_000_000;

const optionSchema = z.object({
  enabled: z.boolean(),
  title: z.string().trim().min(2, "عنوان هر روش ارسال حداقل ۲ حرف است").max(60, "عنوان روش ارسال حداکثر ۶۰ حرف است"),
  description: z.string().trim().max(200, "توضیح روش ارسال حداکثر ۲۰۰ حرف است"),
  pricing: z.enum(PRICING_MODES),
  price: z.number().int().min(0).max(MAX_PRICE, "هزینه ارسال بیش از حد بزرگ است"),
  freeOver: z.number().int().min(1).max(10_000_000_000).nullable(),
  tehranOnly: z.boolean(),
});

export const shippingConfigSchema = z
  .object({
    order: z.array(z.enum(SHIPPING_METHODS)).length(SHIPPING_METHODS.length),
    methods: z.object(Object.fromEntries(SHIPPING_METHODS.map((k) => [k, optionSchema])) as Record<ShippingMethod, typeof optionSchema>),
  })
  .refine((c) => new Set(c.order).size === SHIPPING_METHODS.length, "ترتیب روش‌های ارسال معتبر نیست.")
  .refine((c) => SHIPPING_METHODS.some((k) => c.methods[k].enabled), "حداقل یک روش ارسال باید فعال بماند.")
  .refine((c) => SHIPPING_METHODS.every((k) => c.methods[k].pricing !== "fixed" || c.methods[k].price > 0), "برای روش‌هایی که «هزینه ثابت» دارند، مبلغ را وارد کنید (یا «رایگان» را انتخاب کنید).");

/** Saved settings merged over the defaults; anything unreadable falls back to the defaults. */
export function parseShippingConfig(raw: string | undefined): ShippingConfig {
  if (!raw) return SHIPPING_DEFAULTS;
  try {
    const data = JSON.parse(raw);
    const merged = {
      order: Array.isArray(data?.order) ? data.order : SHIPPING_DEFAULTS.order,
      methods: Object.fromEntries(SHIPPING_METHODS.map((k) => [k, { ...SHIPPING_DEFAULTS.methods[k], ...(data?.methods?.[k] ?? {}) }])),
    };
    const parsed = shippingConfigSchema.safeParse(merged);
    return parsed.success ? parsed.data : SHIPPING_DEFAULTS;
  } catch {
    return SHIPPING_DEFAULTS;
  }
}

export type ShippingQuote = { cost: number; collect: boolean; freeByThreshold: boolean };

/** What the customer pays for shipping at checkout, given the order amount after discount. */
export function quoteShipping(o: ShippingOption, orderAmount: number): ShippingQuote {
  if (o.pricing === "collect") return { cost: 0, collect: true, freeByThreshold: false };
  if (o.pricing === "free") return { cost: 0, collect: false, freeByThreshold: false };
  const free = o.freeOver !== null && orderAmount >= o.freeOver;
  return { cost: free ? 0 : o.price, collect: false, freeByThreshold: free };
}

/** Enabled methods in the owner's order; `allowed` is false for Tehran-only methods unless the address is in Tehran. */
export function availableMethods(c: ShippingConfig, province: string | null) {
  return c.order
    .filter((k) => c.methods[k].enabled)
    .map((key) => ({ key, ...c.methods[key], allowed: !c.methods[key].tehranOnly || province === "تهران" }));
}

/** Methods that don't need a delivery address. */
export const needsAddress = (m: ShippingMethod) => m !== "PICKUP";

/** How an order's shipping cost reads: an amount, «رایگان» or «پس‌کرایه». */
export function shippingCostText(cost: number, collect: boolean, toman: (n: number) => string) {
  if (collect) return "پس‌کرایه (هنگام تحویل)";
  return cost === 0 ? "رایگان" : `${toman(cost)} تومان`;
}

/** For summary rows: «پس‌کرایه» / «رایگان», or undefined to show the amount. */
export const shippingBadge = (cost: number, collect: boolean) => (collect ? "پس‌کرایه" : cost === 0 ? "رایگان" : undefined);
