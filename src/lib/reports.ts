import "server-only";
import { db } from "./db";
import {
  addDays,
  compareJ,
  jDayMonth,
  jFull,
  jKey,
  jLong,
  jalaliDayNumber,
  jalaliMonthLength,
  MONTHS,
  parseJKey,
  tehranDayStart,
  tehranParts,
  tehranToday,
  toJalali,
  weekdayIndex,
  faNum,
  type JDate,
} from "./jalali";
import type { OrderStatus, PaymentMethod, ShippingMethod } from "@/generated/prisma/client";

/** Orders that count as sales (paid online, or confirmed cash-on-delivery and beyond). */
export const SALE_STATUSES: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];
export type Granularity = "day" | "week" | "month";
export const MAX_RANGE_DAYS = 1100;

export const PRESETS = [
  { key: "today", label: "امروز" },
  { key: "yesterday", label: "دیروز" },
  { key: "7d", label: "۷ روز اخیر" },
  { key: "30d", label: "۳۰ روز اخیر" },
  { key: "month", label: "این ماه" },
  { key: "lastmonth", label: "ماه گذشته" },
  { key: "90d", label: "۳ ماه اخیر" },
  { key: "year", label: "امسال" },
] as const;
export type PresetKey = (typeof PRESETS)[number]["key"];

export function presetRange(key: PresetKey, today = tehranToday()): { from: JDate; to: JDate } {
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "30d":
      return { from: addDays(today, -29), to: today };
    case "90d":
      return { from: addDays(today, -89), to: today };
    case "month":
      return { from: { ...today, jd: 1 }, to: today };
    case "lastmonth": {
      const jy = today.jm === 1 ? today.jy - 1 : today.jy;
      const jm = today.jm === 1 ? 12 : today.jm - 1;
      return { from: { jy, jm, jd: 1 }, to: { jy, jm, jd: jalaliMonthLength(jy, jm) } };
    }
    case "year":
      return { from: { jy: today.jy, jm: 1, jd: 1 }, to: today };
  }
}

export const autoGranularity = (days: number): Granularity => (days <= 45 ? "day" : days <= 200 ? "week" : "month");

/** Parses untrusted query params into a safe, bounded range. Defaults to the last 30 days. */
export function parseReportParams(sp: Record<string, string | string[] | undefined>) {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const today = tehranToday();
  const presetKey = PRESETS.some((p) => p.key === one("p")) ? (one("p") as PresetKey) : null;
  let from = parseJKey(one("from"));
  let to = parseJKey(one("to"));

  if (presetKey) ({ from, to } = presetRange(presetKey, today));
  if (!from || !to) ({ from, to } = presetRange("30d", today));
  if (compareJ(from, to) > 0) [from, to] = [to, from];
  if (compareJ(to, today) > 0) to = today;
  if (compareJ(from, to) > 0) from = to;
  const days = jalaliDayNumber(to) - jalaliDayNumber(from) + 1;
  if (days > MAX_RANGE_DAYS) from = addDays(to, -(MAX_RANGE_DAYS - 1));

  const span = jalaliDayNumber(to) - jalaliDayNumber(from) + 1;
  const g = one("g");
  const granularity: Granularity = g === "day" || g === "week" || g === "month" ? g : autoGranularity(span);
  return { from, to, days: span, granularity, preset: presetKey ?? (one("from") ? null : "30d") };
}

export type Bucket = { key: string; label: string; fullLabel: string; start: number; end: number };

/** Splits [from, to] into Jalali day / week (Saturday–Friday) / month buckets with Tehran-midnight boundaries. */
export function buildBuckets(from: JDate, to: JDate, g: Granularity): Bucket[] {
  const buckets: Bucket[] = [];
  let cur = from;
  while (compareJ(cur, to) <= 0) {
    let last: JDate;
    if (g === "day") last = cur;
    else if (g === "week") last = addDays(cur, 6 - weekdayIndex(cur));
    else last = { jy: cur.jy, jm: cur.jm, jd: jalaliMonthLength(cur.jy, cur.jm) };
    if (compareJ(last, to) > 0) last = to;

    const label =
      g === "day"
        ? jDayMonth(cur)
        : g === "week"
          ? `${cur.jm === last.jm ? faNum(cur.jd) : jDayMonth(cur)}–${jDayMonth(last)}`
          : `${MONTHS[cur.jm - 1]} ${faNum(cur.jy)}`;
    const fullLabel =
      g === "day" ? jFull(cur) : g === "week" ? `هفته ${jLong(cur)} تا ${jLong(last)}` : `${MONTHS[cur.jm - 1]} ${faNum(cur.jy)}`;
    buckets.push({ key: jKey(cur), label, fullLabel, start: tehranDayStart(cur).getTime(), end: tehranDayStart(addDays(last, 1)).getTime() });
    cur = addDays(last, 1);
  }
  return buckets;
}

function bucketIndex(buckets: Bucket[], t: number) {
  let lo = 0;
  let hi = buckets.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (t < buckets[mid].start) hi = mid - 1;
    else if (t >= buckets[mid].end) lo = mid + 1;
    else return mid;
  }
  return -1;
}

async function totalsFor(start: Date, end: Date) {
  const agg = await db.order.aggregate({
    where: { status: { in: SALE_STATUSES }, createdAt: { gte: start, lt: end } },
    _sum: { total: true },
    _count: true,
  });
  const items = await db.orderItem.aggregate({
    where: { order: { status: { in: SALE_STATUSES }, createdAt: { gte: start, lt: end } } },
    _sum: { quantity: true },
  });
  const revenue = agg._sum.total ?? 0;
  return { revenue, orders: agg._count, items: items._sum.quantity ?? 0, avg: agg._count ? Math.round(revenue / agg._count) : 0 };
}

export async function salesReport(from: JDate, to: JDate, granularity: Granularity) {
  const start = tehranDayStart(from);
  const end = tehranDayStart(addDays(to, 1));
  const span = jalaliDayNumber(to) - jalaliDayNumber(from) + 1;
  const prevStart = tehranDayStart(addDays(from, -span));

  const [orders, previous, statusGroups, newCustomers] = await Promise.all([
    db.order.findMany({
      where: { status: { in: SALE_STATUSES }, createdAt: { gte: start, lt: end } },
      select: {
        total: true,
        discount: true,
        shippingCost: true,
        createdAt: true,
        paymentMethod: true,
        shippingMethod: true,
        province: true,
        items: { select: { productId: true, name: true, quantity: true, unitPrice: true } },
      },
      take: 50_000,
    }),
    totalsFor(prevStart, start),
    db.order.groupBy({ by: ["status"], where: { createdAt: { gte: start, lt: end } }, _count: true, _sum: { total: true } }),
    db.user.count({ where: { createdAt: { gte: start, lt: end }, role: "CUSTOMER" } }),
  ]);

  const buckets = buildBuckets(from, to, granularity);
  const series = buckets.map((b) => ({ key: b.key, label: b.label, fullLabel: b.fullLabel, revenue: 0, orders: 0, items: 0 }));
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0, revenue: 0 }));
  const weekdays = Array.from({ length: 7 }, (_, i) => ({ index: i, orders: 0, revenue: 0 }));
  const products = new Map<string, { name: string; quantity: number; revenue: number }>();
  const payment = new Map<PaymentMethod, { orders: number; revenue: number }>();
  const shipping = new Map<ShippingMethod, { orders: number; revenue: number }>();
  const provinces = new Map<string, { orders: number; revenue: number }>();

  let revenue = 0;
  let items = 0;
  let discount = 0;
  let shippingIncome = 0;

  for (const o of orders) {
    const t = o.createdAt.getTime();
    const qty = o.items.reduce((s, i) => s + i.quantity, 0);
    revenue += o.total;
    items += qty;
    discount += o.discount;
    shippingIncome += o.shippingCost;

    const bi = bucketIndex(buckets, t);
    if (bi >= 0) {
      series[bi].revenue += o.total;
      series[bi].orders += 1;
      series[bi].items += qty;
    }
    const tp = tehranParts(o.createdAt);
    hours[tp.hour].orders += 1;
    hours[tp.hour].revenue += o.total;
    const wd = weekdayIndex(toJalali(tp.gy, tp.gm, tp.gd));
    weekdays[wd].orders += 1;
    weekdays[wd].revenue += o.total;

    for (const it of o.items) {
      const k = it.productId ?? `deleted:${it.name}`;
      const row = products.get(k) ?? { name: it.name, quantity: 0, revenue: 0 };
      row.quantity += it.quantity;
      row.revenue += it.unitPrice * it.quantity;
      products.set(k, row);
    }
    bump(payment, o.paymentMethod, o.total);
    bump(shipping, o.shippingMethod, o.total);
    bump(provinces, o.province, o.total);
  }

  const cancelled = statusGroups.filter((s) => s.status === "CANCELLED" || s.status === "REFUNDED").reduce((s, g) => s + g._count, 0);
  const pending = statusGroups.find((s) => s.status === "PENDING_PAYMENT")?._count ?? 0;

  return {
    range: { from, to, days: span, granularity },
    totals: {
      revenue,
      orders: orders.length,
      avg: orders.length ? Math.round(revenue / orders.length) : 0,
      items,
      discount,
      shipping: shippingIncome,
      newCustomers,
      cancelled,
      pending,
    },
    previous,
    series,
    hours,
    weekdays,
    topProducts: [...products.entries()]
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    payment: [...payment.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.revenue - a.revenue),
    shipping: [...shipping.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.revenue - a.revenue),
    provinces: [...provinces.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    statuses: statusGroups.map((s) => ({ status: s.status, orders: s._count, total: s._sum.total ?? 0 })),
  };
}

export type SalesReport = Awaited<ReturnType<typeof salesReport>>;

function bump<K>(map: Map<K, { orders: number; revenue: number }>, key: K, amount: number) {
  const row = map.get(key) ?? { orders: 0, revenue: 0 };
  row.orders += 1;
  row.revenue += amount;
  map.set(key, row);
}
