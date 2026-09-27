import "server-only";
import { addDays, parseJKey, tehranDayStart, type JDate } from "./jalali";
import { ORDER_STATUS } from "./shop";
import { presetRange, type PresetKey } from "./reports";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";

export const ORDERS_PAGE_SIZE = 25;
export const ORDER_PRESETS = [
  { key: "all", label: "همه تاریخ‌ها" },
  { key: "today", label: "امروز" },
  { key: "yesterday", label: "دیروز" },
  { key: "7d", label: "۷ روز اخیر" },
  { key: "30d", label: "۳۰ روز اخیر" },
  { key: "month", label: "این ماه" },
  { key: "lastmonth", label: "ماه گذشته" },
] as const;

export type OrderFilters = {
  status?: OrderStatus;
  q?: string;
  pay?: "ONLINE" | "COD";
  noPostal?: boolean;
  from?: JDate;
  to?: JDate;
  preset?: string;
  page: number;
};

/** Parses untrusted query params for the admin order list and export. */
export function parseOrderFilters(sp: Record<string, string | string[] | undefined>): OrderFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const status = one("status");
  const pay = one("pay");
  const p = one("p");
  let from = parseJKey(one("from")) ?? undefined;
  let to = parseJKey(one("to")) ?? undefined;
  if (p && p !== "all" && ORDER_PRESETS.some((x) => x.key === p)) ({ from, to } = presetRange(p as PresetKey));
  const page = Number(one("page"));
  return {
    status: status && status in ORDER_STATUS ? (status as OrderStatus) : undefined,
    q: one("q")?.trim().slice(0, 40) || undefined,
    pay: pay === "ONLINE" || pay === "COD" ? pay : undefined,
    noPostal: one("nopostal") === "1",
    from,
    to: from && to ? to : undefined,
    preset: p,
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

/** Where clause for everything except the status tab (so tab counts reflect the other filters). */
export function orderWhere(f: OrderFilters, withStatus = true): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if (withStatus && f.status) and.push({ status: f.status });
  if (f.pay) and.push({ paymentMethod: f.pay });
  if (f.noPostal) and.push({ postalCode: null });
  if (f.from && f.to) and.push({ createdAt: { gte: tehranDayStart(f.from), lt: tehranDayStart(addDays(f.to, 1)) } });
  if (f.q) {
    const digits = f.q.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/^#/, "");
    const num = /^\d{1,9}$/.test(digits) ? Number(digits) : undefined;
    and.push({
      OR: [
        ...(num !== undefined ? [{ number: num }] : []),
        { user: { phone: { contains: digits } } },
        { receiverPhone: { contains: digits } },
        { receiverName: { contains: f.q, mode: "insensitive" } },
        { trackingCode: { contains: digits } },
      ],
    });
  }
  return { AND: and };
}
