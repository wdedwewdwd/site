"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createSession, destroySession, getSession, requireStaff, safeNext } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { phoneSchema } from "@/lib/validation";

export type AdminLoginState = { error: string } | null;

const schema = z.object({
  phone: phoneSchema,
  password: z.string().min(1).max(128),
  next: z.string().max(512).optional(),
});

const GENERIC_ERROR = "شماره موبایل یا رمز عبور اشتباه است.";

// Verifying against a dummy hash when the account doesn't exist keeps response
// times identical, so timing can't reveal which numbers belong to staff.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("dummy-password-for-timing", env.OTP_PEPPER));

export async function adminLoginAction(_: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const parsed = schema.safeParse({
    phone: formData.get("phone") ?? "",
    password: formData.get("password") ?? "",
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: GENERIC_ERROR };
  const { phone, password, next } = parsed.data;
  const ip = await clientIp();

  // Short passwords must be protected by strict attempt limits (per number and per IP).
  const [perIp, perPhone, perPhoneDay] = await Promise.all([
    rateLimit(`admin-login:ip:${ip}`, 10, 900),
    rateLimit(`admin-login:phone:${phone}`, 5, 900),
    rateLimit(`admin-login:phone-day:${phone}`, 20, 86_400),
  ]);
  if (!perIp.ok || !perPhone.ok || !perPhoneDay.ok) {
    return { error: "تعداد تلاش‌ها بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید." };
  }

  const user = await db.user.findUnique({ where: { phone } });
  const eligible = !!user && user.isActive && !!user.passwordHash && (user.role === "ADMIN" || user.role === "SUPPORT");
  const valid = eligible
    ? await verifyPassword(password, user.passwordHash!, env.OTP_PEPPER)
    : (await verifyPassword(password, await getDummyHash(), env.OTP_PEPPER), false);

  if (!valid) {
    await db.auditLog.create({ data: { actorId: user?.id ?? null, action: "admin.login.failed", meta: { phone }, ip } });
    return { error: GENERIC_ERROR };
  }

  if (await getSession()) await destroySession();
  await createSession(user!.id);
  await db.user.update({ where: { id: user!.id }, data: { lastLoginAt: new Date() } });
  await db.auditLog.create({ data: { actorId: user!.id, action: "admin.login", ip } });

  const target = safeNext(next);
  redirect(target.startsWith("/admin") ? target : "/admin");
}

export type ChangePasswordState = { ok: boolean; message: string } | null;

const changeSchema = z
  .object({ current: z.string().min(1).max(128), next: z.string().min(4, "رمز جدید حداقل ۴ کاراکتر باشد").max(128), confirm: z.string() })
  .refine((d) => d.next === d.confirm, { message: "تکرار رمز جدید مطابقت ندارد", path: ["confirm"] });

export async function changeOwnPassword(_: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  const parsed = changeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const rl = await rateLimit(`admin-pw-change:${staff.id}`, 5, 900);
  if (!rl.ok) return { ok: false, message: "تعداد تلاش‌ها زیاد است. بعداً تلاش کنید." };

  const user = await db.user.findUniqueOrThrow({ where: { id: staff.id } });
  if (!user.passwordHash || !(await verifyPassword(parsed.data.current, user.passwordHash, env.OTP_PEPPER))) {
    return { ok: false, message: "رمز فعلی اشتباه است." };
  }

  const passwordHash = await hashPassword(parsed.data.next, env.OTP_PEPPER);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash } }),
    // Sign out every other device.
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await createSession(user.id);
  await db.auditLog.create({ data: { actorId: user.id, action: "admin.password.change", ip: await clientIp() } });
  return { ok: true, message: "رمز عبور تغییر کرد و سایر دستگاه‌ها از حساب خارج شدند." };
}
