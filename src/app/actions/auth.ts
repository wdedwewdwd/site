"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { issueOtp, verifyOtp } from "@/lib/auth/otp";
import { createSession, destroySession, getSession, safeNext } from "@/lib/auth/session";
import { mergeGuestCart } from "@/lib/cart";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { otpSchema, phoneSchema, STAFF_CODE_LENGTH } from "@/lib/validation";

export type AuthState = { ok: boolean; error?: string; step?: "phone" | "code"; phone?: string } | null;

export async function requestOtpAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = phoneSchema.safeParse(formData.get("phone") ?? "");
  if (!parsed.success) return { ok: false, step: "phone", error: parsed.error.issues[0].message };

  // Staff accounts have a fixed login code instead of SMS. The response is identical
  // to a normal send, so this form can't be used to discover staff numbers.
  const staff = await db.user.findUnique({ where: { phone: parsed.data }, select: { passwordHash: true } });
  if (staff?.passwordHash) return { ok: true, step: "code", phone: parsed.data };

  const res = await issueOtp(parsed.data, await clientIp());
  if (!res.ok) return { ok: false, step: "phone", error: res.error, phone: parsed.data };
  return { ok: true, step: "code", phone: parsed.data };
}

const verifySchema = z.object({ phone: phoneSchema, code: otpSchema, next: z.string().max(512).optional() });

/** Checks a staff member's fixed code. Short codes are only safe behind strict attempt limits. */
async function verifyStaffCode(phone: string, code: string, passwordHash: string, ip: string) {
  const [perIp, perPhone, perPhoneDay] = await Promise.all([
    rateLimit(`staff-code:ip:${ip}`, 10, 900),
    rateLimit(`staff-code:phone:${phone}`, 5, 900),
    rateLimit(`staff-code:phone-day:${phone}`, 20, 86_400),
  ]);
  if (!perIp.ok || !perPhone.ok || !perPhoneDay.ok) return { ok: false as const, error: "تعداد تلاش‌ها بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید." };
  const valid = await verifyPassword(code, passwordHash, env.OTP_PEPPER);
  return valid ? { ok: true as const } : { ok: false as const, error: "کد وارد شده صحیح نیست." };
}

export async function verifyOtpAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = verifySchema.safeParse({
    phone: formData.get("phone") ?? "",
    code: formData.get("code") ?? "",
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { ok: false, step: "code", error: "کد تأیید معتبر نیست.", phone: String(formData.get("phone") ?? "") };

  const { phone, code, next } = parsed.data;
  const ip = await clientIp();
  const existing = await db.user.findUnique({ where: { phone } });
  const isStaffLogin = !!existing?.passwordHash;

  const res = isStaffLogin ? await verifyStaffCode(phone, code, existing.passwordHash!, ip) : await verifyOtp(phone, code, ip);
  if (!res.ok) {
    if (isStaffLogin) await db.auditLog.create({ data: { actorId: existing.id, action: "admin.login.failed", ip } });
    return { ok: false, step: "code", error: res.error, phone };
  }

  if (existing && !existing.isActive) return { ok: false, step: "phone", error: "حساب کاربری شما غیرفعال شده است. با پشتیبانی تماس بگیرید." };

  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        // Older staff codes may be shorter than 6 digits; the panel then asks for a new one.
        data: { lastLoginAt: new Date(), ...(isStaffLogin ? { weakStaffCode: code.length < STAFF_CODE_LENGTH } : {}) },
      })
    : await db.user.create({ data: { phone, lastLoginAt: new Date() } });

  // Session fixation defense: drop any session presented with this request before issuing a new one.
  if (await getSession()) await destroySession();
  await createSession(user.id);
  await mergeGuestCart(user.id);
  await db.auditLog.create({
    data: { actorId: user.id, action: isStaffLogin ? "admin.login" : existing ? "auth.login" : "auth.register", ip },
  });

  if (!existing) redirect(`/profile/account?welcome=1&next=${encodeURIComponent(safeNext(next))}`);
  redirect(safeNext(next));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
