import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { env, isProd } from "./env";
import { hmac, randomToken } from "./crypto";

/**
 * First-party visit tracking for the admin's statistics. A random visitor cookie (400 days) and a
 * session cookie (30 minutes of inactivity) identify browsers; only their HMACs are stored, never IPs.
 */
const VISITOR_COOKIE = isProd ? "__Host-ay_v" : "ay_v";
const SESSION_COOKIE = isProd ? "__Host-ay_s" : "ay_s";
const VISITOR_MAX_AGE = 400 * 24 * 60 * 60;
const SESSION_MAX_AGE = 30 * 60;
/** Longest time on one page we believe (a tab left open overnight is not "engagement"). */
export const MAX_DURATION_MS = 30 * 60 * 1000;

const BOT = /bot|crawl|spider|slurp|archiver|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|gtmetrix|curl|wget|python|axios|node-fetch|okhttp|go-http|java\/|httpclient|monitor|uptime|scan/i;

export function isBot(ua: string) {
  return ua.length < 20 || BOT.test(ua);
}

/** Device type, operating system and browser from a User-Agent (good enough for statistics). */
export function parseUserAgent(ua: string) {
  const s = ua.toLowerCase();
  const tablet = /ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/.test(s);
  const mobile = !tablet && /mobi|iphone|ipod|android|windows phone|opera mini|blackberry/.test(s);
  const os = /windows nt/.test(s)
    ? "Windows"
    : /iphone|ipad|ipod/.test(s)
      ? "iOS"
      : /android/.test(s)
        ? "Android"
        : /mac os x|macintosh/.test(s)
          ? "macOS"
          : /cros/.test(s)
            ? "ChromeOS"
            : /linux/.test(s)
              ? "Linux"
              : "other";
  const browser = /edg(e|a|ios)?\//.test(s)
    ? "Edge"
    : /opr\/|opera|opt\//.test(s)
      ? "Opera"
      : /samsungbrowser/.test(s)
        ? "Samsung Internet"
        : /yabrowser/.test(s)
          ? "Yandex"
          : /firefox|fxios/.test(s)
            ? "Firefox"
            : /crios|chrome|chromium/.test(s)
              ? "Chrome"
              : /safari/.test(s)
                ? "Safari"
                : "other";
  return { device: tablet ? "tablet" : mobile ? "mobile" : "desktop", os, browser };
}

/** Host of an external referrer ("google.com"), or null for none / this site / junk. */
export function referrerHost(ref: string | undefined, ownHost: string) {
  if (!ref) return null;
  try {
    const u = new URL(ref);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const own = ownHost.toLowerCase().replace(/^www\./, "").replace(/:\d+$/, "");
    return host && host !== own ? host.slice(0, 100) : null;
  } catch {
    return null;
  }
}

/** Pages that are not part of the storefront and never counted. */
const NOT_COUNTED = /^\/(admin|api|_next|media)(\/|$)/;

export function normalizePath(path: string) {
  if (!/^\/[^\s?#]{0,300}$/.test(path) || NOT_COUNTED.test(path)) return null;
  return path.length > 1 ? path.replace(/\/+$/, "") || "/" : path;
}

// Product pages are counted per product; slugs are looked up once and remembered for a while.
const slugCache = new Map<string, { id: string | null; at: number }>();
async function productIdForPath(path: string) {
  const slug = path.match(/^\/product\/([^/]{1,200})$/)?.[1];
  if (!slug) return null;
  const hit = slugCache.get(slug);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.id;
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {}
  const p = await db.product.findUnique({ where: { slug: decoded }, select: { id: true } });
  if (slugCache.size > 5000) slugCache.clear();
  slugCache.set(slug, { id: p?.id ?? null, at: Date.now() });
  return p?.id ?? null;
}

const cookieOptions = (maxAge: number) => ({ httpOnly: true, secure: isProd, sameSite: "lax" as const, path: "/", maxAge });
const hashId = (kind: string, token: string) => hmac(env.SESSION_SECRET, `visit-${kind}:${token}`).slice(0, 40);

/** Records one storefront page view and refreshes the visitor/session cookies. Returns the view id. */
export async function recordView(input: {
  path: string;
  search?: string;
  referrer?: string;
  source?: string;
  ua: string;
  ownHost: string;
  userId?: string;
}) {
  const path = normalizePath(input.path);
  if (!path) return null;
  const jar = await cookies();
  let visitorToken = jar.get(VISITOR_COOKIE)?.value;
  let sessionToken = jar.get(SESSION_COOKIE)?.value;
  const newVisitor = !visitorToken || visitorToken.length > 64;
  const isEntry = !sessionToken || sessionToken.length > 64;
  if (newVisitor) visitorToken = randomToken(18);
  if (isEntry) sessionToken = randomToken(18);
  jar.set(VISITOR_COOKIE, visitorToken!, cookieOptions(VISITOR_MAX_AGE));
  jar.set(SESSION_COOKIE, sessionToken!, cookieOptions(SESSION_MAX_AGE));

  const { device, os, browser } = parseUserAgent(input.ua);
  const view = await db.pageView.create({
    data: {
      visitorId: hashId("v", visitorToken!),
      sessionId: hashId("s", sessionToken!),
      path,
      productId: await productIdForPath(path),
      search: path === "/search" && input.search ? input.search.replace(/\s+/g, " ").trim().slice(0, 100) || null : null,
      referrer: isEntry ? referrerHost(input.referrer, input.ownHost) : null,
      source: isEntry && input.source ? input.source.toLowerCase().replace(/[^\p{L}\p{N}._-]/gu, "").slice(0, 50) || null : null,
      device,
      os,
      browser,
      isEntry,
      newVisitor,
      userId: input.userId ?? null,
    },
    select: { id: true },
  });
  return view.id;
}

/** Stores how long a page was visible; only the browser session that viewed it can update it. */
export async function recordLeave(id: string, ms: number) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 64) return;
  const duration = Math.min(Math.max(0, Math.round(ms)), MAX_DURATION_MS);
  await db.pageView.updateMany({
    where: { id, sessionId: hashId("s", token), OR: [{ durationMs: null }, { durationMs: { lt: duration } }] },
    data: { durationMs: duration },
  });
}
