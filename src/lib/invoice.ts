import "server-only";
import { env } from "./env";
import { faDigits, toman } from "./format";
import { ORDER_STATUS, SITE } from "./shop";
import { needsAddress, shippingCostText, type ShippingConfig } from "./shipping-shared";
import type { getContact } from "./settings";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";

/**
 * The customer's invoice, worked out once from the order and shown two ways: on the site
 * (`components/orders/InvoiceView.tsx`) and as a PDF (`lib/invoice-pdf.ts`), so both always say the same.
 * A paid order gets a «فاکتور فروش» dated when it was paid; an unpaid one a «پیش‌فاکتور» dated when it was placed.
 * The invoice number is the order number.
 */

export const invoiceInclude = {
  user: { select: { firstName: true, lastName: true, phone: true, nationalCode: true } },
  items: { orderBy: { id: "asc" } },
  payments: { where: { status: "SUCCEEDED" }, orderBy: { createdAt: "asc" }, take: 1 },
} satisfies Prisma.OrderInclude;

export type InvoiceOrder = Prisma.OrderGetPayload<{ include: typeof invoiceInclude }>;
type Contact = Awaited<ReturnType<typeof getContact>>;

export type InvoiceTone = "green" | "red" | "amber" | "gray";
/** One "label: value" row; `ltr` for codes and phone numbers, which read left to right. */
export type InvoiceLine = { label: string; value: string; ltr?: boolean };

export type Invoice = {
  kind: "invoice" | "proforma";
  title: string;
  number: string;
  orderNumber: number;
  issued: string;
  status: { label: string; tone: InvoiceTone };
  /** Big stamp across the page for orders that no longer stand. */
  stamp: string | null;
  seller: { name: string; latinName: string; website: string; lines: InvoiceLine[] };
  buyer: InvoiceLine[];
  meta: InvoiceLine[];
  items: { name: string; sku: string; quantity: number; unitPrice: number; total: number }[];
  /** Rows above the total: items, discount, shipping. */
  sums: { label: string; value: string; discount?: boolean }[];
  total: { label: string; value: string; words: string };
  payment: InvoiceLine[];
  shipment: InvoiceLine[];
  customerNote: string | null;
  notes: string[];
  fileName: string;
};

/** «پیش‌فاکتور» or «فاکتور فروش» for an order in a list, without loading it all (the rule buildInvoice uses). */
export const invoiceTitle = (o: { status: OrderStatus; paidAt: Date | null }) =>
  o.status === "PENDING_PAYMENT" || (o.status === "CANCELLED" && !o.paidAt) ? "پیش‌فاکتور" : "فاکتور فروش";

const dateFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
/** «۱۴۰۵/۰۸/۱۱ ساعت ۱۴:۰۵» */
export const invoiceDate = (d: Date) => `${dateFmt.format(d)} ساعت ${timeFmt.format(d)}`;

export function buildInvoice(order: InvoiceOrder, contact: Contact, shipping: ShippingConfig): Invoice {
  const payment = order.payments[0] ?? null;
  const paid = !!payment || !!order.paidAt;
  const status = order.status;
  // Never paid and never going to be: still a pro-forma. Everything else that was ordered is a sale.
  const proforma = status === "PENDING_PAYMENT" || (status === "CANCELLED" && !paid);
  const paidAt = order.paidAt ?? payment?.verifiedAt ?? payment?.createdAt ?? null;
  const pickup = !needsAddress(order.shippingMethod);
  const method = shipping.methods[order.shippingMethod].title;
  const buyerName = [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || order.receiverName;
  const website = new URL(env.APP_URL).host;

  const paymentStatus: Invoice["status"] =
    status === "REFUNDED"
      ? { label: "مرجوع شده", tone: "gray" }
      : status === "CANCELLED"
        ? { label: paid ? "لغو شده پس از پرداخت" : "لغو شده", tone: "gray" }
        : paid
          ? { label: "پرداخت شده", tone: "green" }
          : order.paymentMethod === "COD"
            ? { label: "پرداخت در محل", tone: "amber" }
            : { label: "در انتظار پرداخت", tone: "red" };

  const paymentMethod =
    order.paymentMethod === "COD" ? "پرداخت در محل" : payment?.gateway === "manual" ? "واریز مستقیم (تأیید شده توسط فروشگاه)" : "پرداخت اینترنتی (درگاه بانکی)";

  const lines = (rows: (InvoiceLine | false | null | undefined)[]) => rows.filter((r): r is InvoiceLine => !!r && !!r.value);
  const receiverDiffers = order.receiverName !== buyerName || order.receiverPhone !== order.user.phone;

  const notes = [
    proforma && status === "PENDING_PAYMENT" && "این سند پیش‌فاکتور است؛ فاکتور فروش پس از پرداخت صادر می‌شود.",
    status === "CANCELLED" && "این سفارش لغو شده است.",
    status === "REFUNDED" && "کالاهای این سفارش مرجوع شده است.",
    "همهٔ مبالغ به تومان است.",
    `${SITE.name} ۷ روز ضمانت بازگشت کالا می‌دهد؛ شرایط کامل در ${website}/returns`,
    `این ${proforma ? "پیش‌فاکتور" : "فاکتور"} به‌صورت الکترونیکی از سایت ${website} صادر شده است.`,
  ].filter((v): v is string => !!v);

  return {
    kind: proforma ? "proforma" : "invoice",
    title: proforma ? "پیش‌فاکتور" : "فاکتور فروش",
    number: faDigits(order.number),
    orderNumber: order.number,
    issued: invoiceDate(proforma ? order.createdAt : (paidAt ?? order.createdAt)),
    status: paymentStatus,
    stamp: status === "CANCELLED" ? "لغو شده" : status === "REFUNDED" ? "مرجوع شده" : null,
    seller: {
      name: SITE.name,
      latinName: SITE.latinName,
      website,
      lines: lines([
        { label: "نشانی", value: contact.address },
        { label: "کد پستی", value: contact.postalCode ?? "", ltr: true },
        { label: "تلفن", value: faDigits(contact.phoneDisplay), ltr: true },
        { label: "موبایل", value: contact.mobileDisplay ? faDigits(contact.mobileDisplay) : "", ltr: true },
        { label: "ایمیل", value: contact.email ?? "", ltr: true },
      ]),
    },
    buyer: lines([
      { label: "نام", value: buyerName },
      { label: "موبایل", value: faDigits(order.user.phone), ltr: true },
      { label: "کد ملی", value: order.user.nationalCode ? faDigits(order.user.nationalCode) : "", ltr: true },
      receiverDiffers && { label: "تحویل‌گیرنده", value: `${order.receiverName} (${faDigits(order.receiverPhone)})` },
      pickup
        ? { label: "تحویل", value: `حضوری در فروشگاه: ${order.fullAddress}` }
        : { label: "نشانی", value: `${order.province}، ${order.city}، ${order.fullAddress}` },
      !pickup && { label: "کد پستی", value: order.postalCode ? faDigits(order.postalCode) : "", ltr: true },
    ]),
    meta: [
      { label: "شماره سفارش", value: faDigits(order.number) },
      { label: "تاریخ ثبت سفارش", value: invoiceDate(order.createdAt) },
      { label: "روش ارسال", value: method },
      { label: "وضعیت سفارش", value: ORDER_STATUS[status].label },
    ],
    items: order.items.map((i) => ({ name: i.name, sku: i.sku, quantity: i.quantity, unitPrice: i.unitPrice, total: i.unitPrice * i.quantity })),
    sums: [
      { label: "جمع کالاها", value: `${toman(order.subtotal)} تومان` },
      ...(order.discount > 0
        ? [{ label: order.discountCode ? `تخفیف (کد ${order.discountCode})` : "تخفیف", value: `${toman(order.discount)}− تومان`, discount: true }]
        : []),
      // The method itself is shown with the order's details.
      { label: "هزینه ارسال", value: shippingCostText(order.shippingCost, order.shippingCollect, toman) },
    ],
    total: {
      label:
        status === "PENDING_PAYMENT"
          ? "مبلغ قابل پرداخت"
          : status === "CANCELLED" || status === "REFUNDED"
            ? "مبلغ کل"
            : paid
              ? "مبلغ پرداخت شده"
              : "مبلغ قابل پرداخت در محل",
      value: `${toman(order.total)} تومان`,
      words: `${amountInWords(order.total)} تومان`,
    },
    payment: lines([
      { label: "روش پرداخت", value: paymentMethod },
      { label: "وضعیت پرداخت", value: paymentStatus.label },
      paidAt && { label: "تاریخ پرداخت", value: invoiceDate(paidAt) },
      { label: "کد پیگیری پرداخت", value: payment?.refId ? faDigits(payment.refId) : "", ltr: true },
      { label: "شماره کارت", value: payment?.cardPan ? faDigits(payment.cardPan) : "", ltr: true },
    ]),
    shipment: lines([
      { label: "روش ارسال", value: method },
      { label: "ارسال با", value: order.carrier && order.carrier !== method ? order.carrier : "" },
      { label: "کد رهگیری مرسوله", value: order.trackingCode ? faDigits(order.trackingCode) : "", ltr: true },
    ]),
    customerNote: order.note,
    notes,
    fileName: `arizonyadak-${proforma ? "proforma" : "invoice"}-${order.number}.pdf`,
  };
}

const ONES = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const TEENS = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
const TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const HUNDREDS = ["", "یکصد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
const SCALES = ["", "هزار", "میلیون", "میلیارد", "هزار میلیارد"];

function belowThousand(n: number) {
  const parts = [HUNDREDS[Math.floor(n / 100)]];
  const rest = n % 100;
  if (rest >= 10 && rest < 20) parts.push(TEENS[rest - 10]);
  else parts.push(TENS[Math.floor(rest / 10)], ONES[rest % 10]);
  return parts.filter(Boolean).join(" و ");
}

/** 1250000 → «یک میلیون و دویست و پنجاه هزار», as written on cheques and invoices. */
export function amountInWords(value: number) {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return "صفر";
  const groups: string[] = [];
  for (let rest = n, scale = 0; rest > 0; rest = Math.floor(rest / 1000), scale++) {
    const group = rest % 1000;
    if (group) groups.unshift([belowThousand(group), SCALES[scale]].filter(Boolean).join(" "));
  }
  return (value < 0 ? "منفی " : "") + groups.join(" و ");
}
