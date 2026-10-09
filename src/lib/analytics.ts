import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { addDays, jalaliDayNumber, tehranDayStart, type JDate } from "./jalali";
import { buildBuckets, SALE_STATUSES, type Granularity } from "./reports";

/** Visits that ended this long ago are no longer "online". */
const LIVE_WINDOW_MS = 5 * 60 * 1000;
/** Raw page views are kept this long (about 13 months, so a full year can be compared). */
export const PAGE_VIEW_RETENTION_DAYS = 400;

// PageView.createdAt is a UTC timestamp without time zone; bounds are passed the same way.
const ts = (d: Date | number) => new Date(d).toISOString().slice(0, 23).replace("T", " ");
const inRange = (start: Date, end: Date) => Prisma.sql`"createdAt" >= ${ts(start)}::timestamp AND "createdAt" < ${ts(end)}::timestamp`;
const TEHRAN = Prisma.sql`(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tehran')`;

/** Where visitors came from. Order = display order of the known channels. */
export const CHANNELS = [
  { key: "direct", label: "ورود مستقیم (تایپ آدرس یا ذخیره‌شده)" },
  { key: "google", label: "گوگل" },
  { key: "search", label: "سایر موتورهای جستجو" },
  { key: "torob", label: "ترب" },
  { key: "emalls", label: "ایمالز" },
  { key: "instagram", label: "اینستاگرام" },
  { key: "telegram", label: "تلگرام" },
  { key: "whatsapp", label: "واتساپ" },
  { key: "iranian", label: "پیام‌رسان‌های ایرانی (ایتا، بله، روبیکا)" },
  { key: "other", label: "سایر سایت‌ها" },
] as const;
type ChannelKey = (typeof CHANNELS)[number]["key"];

const CHANNEL_RULES: [ChannelKey, RegExp][] = [
  ["google", /(^|\.)google\.|^google$/],
  ["search", /(^|\.)(bing\.com|yandex\.|duckduckgo\.com|yahoo\.com|ecosia\.org|search\.)|^(bing|yandex|duckduckgo|yahoo)$/],
  ["torob", /torob/],
  ["emalls", /emalls/],
  ["instagram", /instagram|^ig$/],
  ["telegram", /(^|\.)t\.me$|telegram/],
  ["whatsapp", /whatsapp|(^|\.)wa\.me$/],
  ["iranian", /eitaa|(^|\.)ble\.ir$|^bale$|rubika|soroush|igap/],
];

/** Channel of a session from its utm_source (if the link had one) or the referring site. */
export function channelOf(referrer: string | null, source: string | null): ChannelKey {
  const probe = source || referrer;
  if (!probe) return "direct";
  for (const [key, rule] of CHANNEL_RULES) if (rule.test(probe)) return key;
  return "other";
}

const DEVICE_LABEL: Record<string, string> = { mobile: "موبایل", tablet: "تبلت", desktop: "کامپیوتر" };
const OTHER = "سایر";
const label = (v: string, map?: Record<string, string>) => map?.[v] ?? (v === "other" ? OTHER : v);

/** Readable names for storefront pages. */
const STATIC_PAGES: Record<string, string> = {
  "/": "صفحه اصلی",
  "/products": "همه محصولات",
  "/categories": "دسته‌بندی‌ها",
  "/offers": "تخفیف‌ها و پیشنهادها",
  "/search": "جستجو",
  "/cart": "سبد خرید",
  "/checkout": "تکمیل خرید (آدرس و ارسال)",
  "/checkout/payment": "پرداخت",
  "/login": "ورود / ثبت‌نام",
  "/about": "درباره ما",
  "/contact": "تماس با ما",
  "/faq": "سؤالات متداول",
  "/support": "پشتیبانی",
  "/terms": "قوانین و مقررات",
  "/privacy": "حریم خصوصی",
  "/returns": "رویه بازگرداندن کالا",
  "/shipping": "رویه ارسال",
  "/payment-methods": "شیوه‌های پرداخت",
  "/how-to-order": "راهنمای خرید",
  "/profile": "حساب کاربری",
  "/profile/orders": "سفارش‌های من",
  "/profile/wishlist": "علاقه‌مندی‌ها",
  "/profile/addresses": "آدرس‌های من",
};

async function pageLabels(paths: string[]) {
  const slug = (prefix: string) => paths.flatMap((p) => (p.startsWith(prefix) ? [safeDecode(p.slice(prefix.length))] : []));
  const [products, categories] = await Promise.all([
    db.product.findMany({ where: { slug: { in: slug("/product/") } }, select: { slug: true, name: true, id: true } }),
    db.category.findMany({ where: { slug: { in: slug("/category/") } }, select: { slug: true, name: true } }),
  ]);
  const productBySlug = new Map(products.map((p) => [p.slug, p]));
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.name]));
  return (path: string): { label: string; href: string | null } => {
    if (STATIC_PAGES[path]) return { label: STATIC_PAGES[path], href: path };
    if (path.startsWith("/product/")) {
      const p = productBySlug.get(safeDecode(path.slice(9)));
      return { label: p ? p.name : "محصول حذف‌شده", href: p ? path : null };
    }
    if (path.startsWith("/category/")) {
      const c = categoryBySlug.get(safeDecode(path.slice(10)));
      return { label: c ? `دسته: ${c}` : "دسته حذف‌شده", href: c ? path : null };
    }
    if (path.startsWith("/checkout/result")) return { label: "نتیجه سفارش", href: null };
    if (path.startsWith("/profile")) return { label: "حساب کاربری", href: null };
    return { label: path, href: path };
  };
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

type Totals = { views: number; visitors: number; sessions: number; bounces: number; avgDur: number; newVisitors: number };

/** Visits, visitors, sessions, bounces (one-page sessions) and average engaged time per session. */
async function totalsFor(start: Date, end: Date) {
  const [row] = await db.$queryRaw<Totals[]>`
    WITH s AS (
      SELECT "sessionId", count(*) AS n, coalesce(sum("durationMs"), 0) AS dur, bool_or("newVisitor") AS nv, min("visitorId") AS v
      FROM "PageView" WHERE ${inRange(start, end)} GROUP BY "sessionId"
    )
    SELECT count(*)::int AS sessions, coalesce(sum(n), 0)::int AS views, count(DISTINCT v)::int AS visitors,
      (count(*) FILTER (WHERE n = 1))::int AS bounces, coalesce(avg(dur), 0)::float8 AS "avgDur",
      (count(DISTINCT v) FILTER (WHERE nv))::int AS "newVisitors"
    FROM s`;
  const orders = await db.order.count({ where: { createdAt: { gte: start, lt: end } } });
  return {
    ...row,
    orders,
    bounceRate: row.sessions ? (row.bounces / row.sessions) * 100 : 0,
    pagesPerSession: row.sessions ? row.views / row.sessions : 0,
    conversion: row.sessions ? (orders / row.sessions) * 100 : 0,
  };
}

export async function trafficReport(from: JDate, to: JDate, granularity: Granularity) {
  const start = tehranDayStart(from);
  const end = tehranDayStart(addDays(to, 1));
  const span = jalaliDayNumber(to) - jalaliDayNumber(from) + 1;
  const prevStart = tehranDayStart(addDays(from, -span));
  const range = inRange(start, end);
  const buckets = buildBuckets(from, to, granularity);

  const [totals, previous, seriesRows, timeRows, pageRows, entryRows, productRows, sourceRows, deviceRows, searchRows, funnelRow] = await Promise.all([
    totalsFor(start, end),
    totalsFor(prevStart, start),
    db.$queryRaw<{ i: number; views: number; visitors: number; sessions: number }[]>`
      SELECT b.i::int AS i, count(pv.id)::int AS views, count(DISTINCT pv."visitorId")::int AS visitors, count(DISTINCT pv."sessionId")::int AS sessions
      FROM unnest(${buckets.map((b) => ts(b.start))}::timestamp[], ${buckets.map((b) => ts(b.end))}::timestamp[]) WITH ORDINALITY AS b(s, e, i)
      LEFT JOIN "PageView" pv ON pv."createdAt" >= b.s AND pv."createdAt" < b.e
      GROUP BY b.i ORDER BY b.i`,
    db.$queryRaw<{ h: number; d: number; views: number; visitors: number }[]>`
      SELECT extract(hour FROM ${TEHRAN})::int AS h, extract(dow FROM ${TEHRAN})::int AS d, count(*)::int AS views, count(DISTINCT "visitorId")::int AS visitors
      FROM "PageView" WHERE ${range} GROUP BY 1, 2`,
    db.$queryRaw<{ path: string; views: number; visitors: number; avgMs: number | null }[]>`
      SELECT path, count(*)::int AS views, count(DISTINCT "visitorId")::int AS visitors, avg("durationMs")::float8 AS "avgMs"
      FROM "PageView" WHERE ${range} GROUP BY path ORDER BY views DESC, path LIMIT 12`,
    db.$queryRaw<{ path: string; sessions: number; bounces: number }[]>`
      WITH s AS (SELECT "sessionId", count(*) AS n FROM "PageView" WHERE ${range} GROUP BY "sessionId")
      SELECT pv.path, count(*)::int AS sessions, (count(*) FILTER (WHERE s.n = 1))::int AS bounces
      FROM "PageView" pv JOIN s ON s."sessionId" = pv."sessionId"
      WHERE pv."isEntry" AND pv."createdAt" >= ${ts(start)}::timestamp AND pv."createdAt" < ${ts(end)}::timestamp
      GROUP BY pv.path ORDER BY sessions DESC, pv.path LIMIT 8`,
    db.$queryRaw<{ productId: string; views: number; visitors: number }[]>`
      SELECT "productId", count(*)::int AS views, count(DISTINCT "visitorId")::int AS visitors
      FROM "PageView" WHERE ${range} AND "productId" IS NOT NULL GROUP BY 1 ORDER BY views DESC LIMIT 10`,
    db.$queryRaw<{ referrer: string | null; source: string | null; sessions: number }[]>`
      SELECT referrer, source, count(*)::int AS sessions FROM "PageView" WHERE ${range} AND "isEntry" GROUP BY 1, 2`,
    db.$queryRaw<{ device: string; os: string; browser: string; sessions: number }[]>`
      SELECT device, os, browser, count(*)::int AS sessions FROM "PageView" WHERE ${range} AND "isEntry" GROUP BY 1, 2, 3`,
    db.$queryRaw<{ term: string; views: number; visitors: number }[]>`
      SELECT lower(search) AS term, count(*)::int AS views, count(DISTINCT "visitorId")::int AS visitors
      FROM "PageView" WHERE ${range} AND search IS NOT NULL GROUP BY 1 ORDER BY views DESC, term LIMIT 15`,
    db.$queryRaw<{ sessions: number; product: number; cart: number; checkout: number }[]>`
      SELECT count(DISTINCT "sessionId")::int AS sessions,
        (count(DISTINCT "sessionId") FILTER (WHERE "productId" IS NOT NULL))::int AS product,
        (count(DISTINCT "sessionId") FILTER (WHERE path = '/cart'))::int AS cart,
        (count(DISTINCT "sessionId") FILTER (WHERE path LIKE '/checkout%'))::int AS checkout
      FROM "PageView" WHERE ${range}`,
  ]);

  const series = buckets.map((b, i) => {
    const r = seriesRows.find((x) => x.i === i + 1);
    return { key: b.key, label: b.label, fullLabel: b.fullLabel, views: r?.views ?? 0, visitors: r?.visitors ?? 0, sessions: r?.sessions ?? 0 };
  });

  // Hours and Jalali weekdays (Saturday first) in Tehran time; Postgres dow is 0 = Sunday.
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, value: 0 }));
  const weekdays = Array.from({ length: 7 }, (_, index) => ({ index, value: 0 }));
  for (const r of timeRows) {
    hours[r.h].value += r.views;
    weekdays[(r.d + 1) % 7].value += r.views;
  }

  const labelOf = await pageLabels([...pageRows.map((p) => p.path), ...entryRows.map((p) => p.path)]);

  const productIds = productRows.map((p) => p.productId);
  const [productInfo, sold] = await Promise.all([
    db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, slug: true } }),
    db.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds }, order: { status: { in: SALE_STATUSES }, createdAt: { gte: start, lt: end } } },
      _sum: { quantity: true },
    }),
  ]);

  const channels = new Map<ChannelKey, number>();
  const referrers = new Map<string, number>();
  for (const r of sourceRows) {
    const key = channelOf(r.referrer, r.source);
    channels.set(key, (channels.get(key) ?? 0) + r.sessions);
    if (r.referrer) referrers.set(r.referrer, (referrers.get(r.referrer) ?? 0) + r.sessions);
  }

  const groupBy = (field: "device" | "os" | "browser", map?: Record<string, string>) => {
    const m = new Map<string, number>();
    for (const r of deviceRows) m.set(r[field], (m.get(r[field]) ?? 0) + r.sessions);
    return [...m.entries()].map(([key, sessions]) => ({ key, label: label(key, map), sessions })).sort((a, b) => b.sessions - a.sessions);
  };

  return {
    range: { from, to, days: span, granularity },
    totals,
    previous,
    series,
    hours,
    weekdays,
    pages: pageRows.map((p) => ({ ...p, ...labelOf(p.path), avgMs: p.avgMs ?? 0 })),
    entries: entryRows.map((p) => ({ ...p, ...labelOf(p.path), bounceRate: p.sessions ? (p.bounces / p.sessions) * 100 : 0 })),
    products: productRows.map((p) => {
      const info = productInfo.find((x) => x.id === p.productId);
      return { id: p.productId, name: info?.name ?? "محصول حذف‌شده", exists: !!info, views: p.views, visitors: p.visitors, sold: sold.find((s) => s.productId === p.productId)?._sum.quantity ?? 0 };
    }),
    channels: CHANNELS.map((c) => ({ key: c.key, label: c.label, sessions: channels.get(c.key) ?? 0 })).filter((c) => c.sessions > 0).sort((a, b) => b.sessions - a.sessions),
    referrers: [...referrers.entries()].map(([host, sessions]) => ({ host, sessions })).sort((a, b) => b.sessions - a.sessions).slice(0, 8),
    devices: groupBy("device", DEVICE_LABEL),
    os: groupBy("os").slice(0, 6),
    browsers: groupBy("browser").slice(0, 6),
    searches: searchRows,
    funnel: { ...funnelRow[0], orders: totals.orders },
  };
}

export type TrafficReport = Awaited<ReturnType<typeof trafficReport>>;

/** Who is on the site right now: visitors with a page view in the last few minutes, and where they are. */
export async function liveVisitors() {
  const since = new Date(Date.now() - LIVE_WINDOW_MS);
  const rows = await db.$queryRaw<{ path: string; visitors: number }[]>`
    SELECT path, count(*)::int AS visitors FROM (
      SELECT DISTINCT ON ("visitorId") "visitorId", path FROM "PageView"
      WHERE "createdAt" >= ${ts(since)}::timestamp ORDER BY "visitorId", "createdAt" DESC
    ) last GROUP BY path ORDER BY visitors DESC, path LIMIT 8`;
  const labelOf = await pageLabels(rows.map((r) => r.path));
  return {
    visitors: rows.reduce((s, r) => s + r.visitors, 0),
    pages: rows.map((r) => ({ path: r.path, visitors: r.visitors, ...labelOf(r.path) })),
  };
}

/** Visitors today (Tehran), for the dashboard. */
export async function visitorsToday(today: JDate) {
  const [row] = await db.$queryRaw<{ visitors: number; views: number }[]>`
    SELECT count(DISTINCT "visitorId")::int AS visitors, count(*)::int AS views FROM "PageView"
    WHERE ${inRange(tehranDayStart(today), tehranDayStart(addDays(today, 1)))}`;
  return row;
}
