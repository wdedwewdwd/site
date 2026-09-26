"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, safeNext } from "@/lib/auth/session";
import { PROVINCES, isValidNationalCode } from "@/lib/iran";
import { idSchema, phoneSchema, postalCodeSchema, text, toEnDigits } from "@/lib/validation";

export type FormState = { ok: boolean; message?: string; errors?: Record<string, string> } | null;

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

const personName = text(50).refine((v) => /^[\p{L}\s‌'-]+$/u.test(v), "فقط حروف مجاز است");

const accountSchema = z.object({
  firstName: personName,
  lastName: personName,
  email: z.union([z.literal(""), z.email("ایمیل معتبر نیست").max(120)]),
  nationalCode: z
    .string()
    .transform((v) => toEnDigits(v).trim())
    .refine((v) => v === "" || isValidNationalCode(v), "کد ملی معتبر نیست"),
});

export async function updateAccount(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/profile/account");
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { firstName, lastName, email, nationalCode } = parsed.data;
  await db.user.update({
    where: { id: user.id },
    data: { firstName, lastName, email: email || null, nationalCode: nationalCode || null },
  });
  revalidatePath("/", "layout");

  const next = formData.get("next");
  if (typeof next === "string" && next) redirect(safeNext(next));
  return { ok: true, message: "اطلاعات حساب ذخیره شد." };
}

const addressSchema = z.object({
  id: z.union([z.literal(""), idSchema]).optional(),
  title: z.union([z.literal(""), text(30)]).optional(),
  receiverName: text(80, 3),
  receiverPhone: phoneSchema,
  province: z.enum(PROVINCES, "استان را انتخاب کنید"),
  city: text(50, 2),
  postalCode: postalCodeSchema,
  fullAddress: text(300, 10),
  isDefault: z.string().optional(),
});

const MAX_ADDRESSES = 10;

export async function saveAddress(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/profile/addresses");
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { id, isDefault, title, ...data } = parsed.data;

  const count = await db.address.count({ where: { userId: user.id } });
  if (!id && count >= MAX_ADDRESSES) return { ok: false, message: `حداکثر ${MAX_ADDRESSES} آدرس می‌توانید ثبت کنید.` };
  const makeDefault = isDefault === "on" || count === 0;

  const saved = await db.$transaction(async (tx) => {
    if (id) {
      // Scope by userId so one user can never edit another user's address (IDOR protection).
      const owned = await tx.address.count({ where: { id, userId: user.id } });
      if (!owned) return false;
    }
    if (makeDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    if (id) {
      await tx.address.update({
        where: { id },
        data: { ...data, title: title || null, ...(makeDefault ? { isDefault: true } : {}) },
      });
    } else {
      await tx.address.create({ data: { ...data, title: title || null, userId: user.id, isDefault: makeDefault } });
    }
    return true;
  });
  if (!saved) return { ok: false, message: "آدرس یافت نشد." };

  revalidatePath("/profile/addresses");
  revalidatePath("/checkout");
  const next = formData.get("next");
  redirect(typeof next === "string" && next ? safeNext(next) : "/profile/addresses");
}

export async function deleteAddress(id: string) {
  const user = await requireUser();
  if (!idSchema.safeParse(id).success) return;
  await db.address.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/profile/addresses");
}

export async function setDefaultAddress(id: string) {
  const user = await requireUser();
  if (!idSchema.safeParse(id).success) return;
  const owned = await db.address.count({ where: { id, userId: user.id } });
  if (!owned) return;
  await db.$transaction([
    db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    db.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/profile/addresses");
  revalidatePath("/checkout");
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/profile", "layout");
}
