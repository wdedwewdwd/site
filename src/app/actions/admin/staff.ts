"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { idSchema, phoneSchema, staffCodeSchema, text, toEnDigits } from "@/lib/validation";

export type StaffFormState = { ok: boolean; message: string } | null;

const digits = z.string().transform((v) => toEnDigits(v).trim());
const nameRe = /^[\p{L}\s‌'-]+$/u;
const firstName = text(50).refine((v) => nameRe.test(v), "در نام فقط حروف مجاز است");
const lastName = text(50, 0).refine((v) => v === "" || nameRe.test(v), "در نام خانوادگی فقط حروف مجاز است");
const role = z.enum(["ADMIN", "SUPPORT"], "نقش را انتخاب کنید");

const addSchema = z
  .object({ phone: phoneSchema, firstName, lastName, role, code: digits.pipe(staffCodeSchema), confirm: digits, myCode: digits })
  .refine((d) => d.code === d.confirm, { message: "تکرار کد ورود مطابقت ندارد", path: ["confirm"] });

const updateSchema = z
  .object({
    id: idSchema,
    firstName,
    lastName,
    role,
    code: digits.pipe(z.union([z.literal(""), staffCodeSchema])),
    confirm: digits,
    myCode: digits,
  })
  .refine((d) => d.code === d.confirm, { message: "تکرار کد ورود مطابقت ندارد", path: ["confirm"] });

/** Staff accounts: anyone with a panel role or a fixed login code. */
const staffWhere = { OR: [{ role: { not: "CUSTOMER" as const } }, { passwordHash: { not: null } }] };

/**
 * Creating or changing another staff login is the most sensitive thing in the panel, so the
 * signed-in admin re-enters their own code (a stolen session alone is not enough).
 */
async function confirmOwnCode(adminId: string, code: string) {
  const rl = await rateLimit(`staff-confirm:${adminId}`, 5, 900);
  if (!rl.ok) return "تعداد تلاش‌ها زیاد است. ۱۵ دقیقه دیگر دوباره تلاش کنید.";
  const me = await db.user.findUnique({ where: { id: adminId }, select: { passwordHash: true } });
  if (!me?.passwordHash || !(await verifyPassword(code, me.passwordHash, env.OTP_PEPPER))) {
    await audit(adminId, "staff.confirm.failed");
    return "کد ورود خودتان (برای تأیید) اشتباه است.";
  }
  return null;
}

const done = (message: string): StaffFormState => {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/customers");
  return { ok: true, message };
};

export async function addStaff(_: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const admin = await requireStaff(["ADMIN"]);
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;

  const denied = await confirmOwnCode(admin.id, d.myCode);
  if (denied) return { ok: false, message: denied };

  const existing = await db.user.findUnique({ where: { phone: d.phone }, select: { id: true, passwordHash: true } });
  if (existing?.passwordHash) return { ok: false, message: "این شماره قبلاً در فهرست مدیران است. برای تغییر کد، دکمه «ویرایش» کنار آن را بزنید." };

  const passwordHash = await hashPassword(d.code, env.OTP_PEPPER);
  const data = { firstName: d.firstName, lastName: d.lastName || null, role: d.role, passwordHash, isActive: true };
  const user = existing
    ? // A customer who already has an account keeps their orders and addresses; old sessions end.
      (await db.$transaction([db.user.update({ where: { id: existing.id }, data }), db.session.deleteMany({ where: { userId: existing.id } })]))[0]
    : await db.user.create({ data: { phone: d.phone, ...data } });

  await audit(admin.id, "staff.add", "User", user.id, { role: d.role });
  return done(`${d.firstName} اضافه شد و از همین حالا می‌تواند با شماره خودش و این کد وارد شود.`);
}

export async function updateStaff(_: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const admin = await requireStaff(["ADMIN"]);
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.id === admin.id) return { ok: false, message: "کد خودتان را از بخش «کد ورود ثابت من» تغییر دهید." };

  const target = await db.user.findFirst({ where: { id: d.id, ...staffWhere }, select: { id: true, role: true, passwordHash: true } });
  if (!target) return { ok: false, message: "این حساب پیدا نشد." };
  if (!d.code && !target.passwordHash) return { ok: false, message: "برای این شخص هنوز کد ورود تعریف نشده؛ یک کد وارد کنید." };

  const denied = await confirmOwnCode(admin.id, d.myCode);
  if (denied) return { ok: false, message: denied };

  const codeChanged = d.code !== "";
  const roleChanged = d.role !== target.role;
  await db.$transaction([
    db.user.update({
      where: { id: target.id },
      data: {
        firstName: d.firstName,
        lastName: d.lastName || null,
        role: d.role,
        ...(codeChanged ? { passwordHash: await hashPassword(d.code, env.OTP_PEPPER) } : {}),
      },
    }),
    // A new code or different access level signs the person out everywhere.
    ...(codeChanged || roleChanged ? [db.session.deleteMany({ where: { userId: target.id } })] : []),
  ]);

  await audit(admin.id, "staff.update", "User", target.id, { role: d.role, codeChanged });
  return done(codeChanged ? "ذخیره شد. کد قبلی دیگر کار نمی‌کند." : "ذخیره شد.");
}

/** Takes away panel access; the person stays a normal customer and signs in with SMS again. */
export async function removeStaff(id: string): Promise<StaffFormState> {
  const admin = await requireStaff(["ADMIN"]);
  if (!idSchema.safeParse(id).success) return { ok: false, message: "درخواست نامعتبر است." };
  if (id === admin.id) return { ok: false, message: "نمی‌توانید دسترسی خودتان را حذف کنید." };

  const target = await db.user.findFirst({ where: { id, ...staffWhere }, select: { id: true } });
  if (!target) return { ok: false, message: "این حساب پیدا نشد." };

  await db.$transaction([
    db.user.update({ where: { id }, data: { role: "CUSTOMER", passwordHash: null } }),
    db.session.deleteMany({ where: { userId: id } }),
  ]);
  await audit(admin.id, "staff.remove", "User", id);
  return done("دسترسی پنل حذف شد.");
}
