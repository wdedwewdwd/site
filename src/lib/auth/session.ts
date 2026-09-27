import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db";
import { env, isProd } from "../env";
import { hmac, randomToken } from "../crypto";
import { clientIp, userAgent } from "../request";
import type { Role } from "@/generated/prisma/client";

// `__Host-` cookies are bound to this exact origin, HTTPS-only and path=/ (no subdomain can overwrite them).
export const SESSION_COOKIE = isProd ? "__Host-ay_session" : "ay_session";
const SESSION_DAYS = 30;
/** Staff must have signed in recently to use the admin panel. */
const STAFF_MAX_SESSION_AGE_MS = 12 * 60 * 60 * 1000;

const hashToken = (token: string) => hmac(env.SESSION_SECRET, token);

export async function createSession(userId: string) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt, ip: await clientIp(), userAgent: await userAgent() },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Current session + user, or null. Memoized per request. */
export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 128) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: { select: { id: true, phone: true, firstName: true, lastName: true, role: true, isActive: true } },
    },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  return session;
});

export async function getUser() {
  return (await getSession())?.user ?? null;
}

/** For pages/actions that need a signed-in customer. */
export async function requireUser(next = "/") {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  return user;
}

/** For admin pages/actions. Role is re-checked from the database on every request. */
export async function requireStaff(roles: Role[] = ["ADMIN"]) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (!roles.includes(session.user.role)) redirect("/");
  // Staff must have a fixed login code set (via scripts/set-admin.ts); SMS-only accounts never get panel access.
  const hasPassword = await db.user.count({ where: { id: session.user.id, passwordHash: { not: null } } });
  if (!hasPassword) redirect("/");
  if (Date.now() - session.createdAt.getTime() > STAFF_MAX_SESSION_AGE_MS) {
    await destroySession();
    redirect("/login?next=/admin&reauth=1");
  }
  return session.user;
}

/** Same checks as requireStaff, for API routes: returns null instead of redirecting. */
export async function getStaff(roles: Role[] = ["ADMIN"]) {
  const session = await getSession();
  if (!session || !roles.includes(session.user.role)) return null;
  if (Date.now() - session.createdAt.getTime() > STAFF_MAX_SESSION_AGE_MS) return null;
  const hasPassword = await db.user.count({ where: { id: session.user.id, passwordHash: { not: null } } });
  return hasPassword ? session.user : null;
}

/** Only allow same-site relative redirects (prevents open-redirect attacks). */
export function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next.slice(0, 512);
}
