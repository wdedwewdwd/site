"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { issueOtp, verifyOtp } from "@/lib/auth/otp";
import { createSession, destroySession, getSession, safeNext } from "@/lib/auth/session";
import { mergeGuestCart } from "@/lib/cart";
import { clientIp } from "@/lib/request";
import { otpSchema, phoneSchema } from "@/lib/validation";

export type AuthState = { ok: boolean; error?: string; step?: "phone" | "code"; phone?: string } | null;

const adminPhones = () => new Set(env.ADMIN_PHONES.split(",").map((p) => p.trim()).filter(Boolean));

export async function requestOtpAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = phoneSchema.safeParse(formData.get("phone") ?? "");
  if (!parsed.success) return { ok: false, step: "phone", error: parsed.error.issues[0].message };

  const res = await issueOtp(parsed.data, await clientIp());
  if (!res.ok) return { ok: false, step: "phone", error: res.error, phone: parsed.data };
  return { ok: true, step: "code", phone: parsed.data };
}

const verifySchema = z.object({ phone: phoneSchema, code: otpSchema, next: z.string().max(512).optional() });

export async function verifyOtpAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = verifySchema.safeParse({
    phone: formData.get("phone") ?? "",
    code: formData.get("code") ?? "",
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { ok: false, step: "code", error: "کد تأیید معتبر نیست.", phone: String(formData.get("phone") ?? "") };

  const { phone, code, next } = parsed.data;
  const ip = await clientIp();
  const res = await verifyOtp(phone, code, ip);
  if (!res.ok) return { ok: false, step: "code", error: res.error, phone };

  const isAdminPhone = adminPhones().has(phone);
  const existing = await db.user.findUnique({ where: { phone } });
  if (existing && !existing.isActive) return { ok: false, step: "phone", error: "حساب کاربری شما غیرفعال شده است. با پشتیبانی تماس بگیرید." };

  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: { lastLoginAt: new Date(), ...(isAdminPhone && existing.role !== "ADMIN" ? { role: "ADMIN" } : {}) },
      })
    : await db.user.create({ data: { phone, lastLoginAt: new Date(), role: isAdminPhone ? "ADMIN" : "CUSTOMER" } });

  // Session fixation defense: drop any session presented with this request before issuing a new one.
  if (await getSession()) await destroySession();
  await createSession(user.id);
  await mergeGuestCart(user.id);
  await db.auditLog.create({ data: { actorId: user.id, action: existing ? "auth.login" : "auth.register", ip } });

  if (!existing) redirect(`/profile/account?welcome=1&next=${encodeURIComponent(safeNext(next))}`);
  redirect(safeNext(next));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
