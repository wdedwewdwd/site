"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createSession, requireStaff } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { staffCodeSchema, toEnDigits } from "@/lib/validation";

export type ChangePasswordState = { ok: boolean; message: string } | null;

const digits = z.string().transform((v) => toEnDigits(v).trim());
const changeSchema = z
  .object({ current: digits, next: digits.pipe(staffCodeSchema), confirm: digits })
  .refine((d) => d.next === d.confirm, { message: "تکرار کد جدید مطابقت ندارد", path: ["confirm"] });

/** Changes the signed-in staff member's fixed login code. */
export async function changeOwnPassword(_: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  const parsed = changeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const rl = await rateLimit(`admin-pw-change:${staff.id}`, 5, 900);
  if (!rl.ok) return { ok: false, message: "تعداد تلاش‌ها زیاد است. بعداً تلاش کنید." };

  const user = await db.user.findUniqueOrThrow({ where: { id: staff.id } });
  if (!user.passwordHash || !(await verifyPassword(parsed.data.current, user.passwordHash, env.OTP_PEPPER))) {
    return { ok: false, message: "کد فعلی اشتباه است." };
  }

  const passwordHash = await hashPassword(parsed.data.next, env.OTP_PEPPER);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash, weakStaffCode: false } }),
    // Sign out every other device.
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await createSession(user.id);
  await db.auditLog.create({ data: { actorId: user.id, action: "admin.password.change", ip: await clientIp() } });
  return { ok: true, message: "کد ورود تغییر کرد و سایر دستگاه‌ها از حساب خارج شدند." };
}
