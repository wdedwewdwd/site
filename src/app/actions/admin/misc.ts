"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { idSchema, text, toEnDigits } from "@/lib/validation";
import { inIran, roundCoord } from "@/lib/location";
import { faDigits } from "@/lib/format";
import { addDays, compareJ, jKey, parseJKey, tehranDayStart, tehranJDate, tehranToday } from "@/lib/jalali";

export type AdminFormState = { ok: boolean; error?: string; message?: string } | null;

const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "اطلاعات نامعتبر است.";
const int = (max: number) => z.string().transform((v) => toEnDigits(v).replace(/[,\s]/g, "")).pipe(z.string().regex(/^\d+$/, "عدد معتبر وارد کنید")).transform(Number).pipe(z.number().max(max));

// ─── Customers ─────────────────────────────────────────────

export async function setUserActive(userId: string, active: boolean) {
  const admin = await requireStaff(["ADMIN"]);
  if (!idSchema.safeParse(userId).success || userId === admin.id) return;
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { isActive: active } }),
    // Deactivation also signs the user out everywhere.
    ...(active ? [] : [db.session.deleteMany({ where: { userId } })]),
  ]);
  await audit(admin.id, active ? "user.activate" : "user.deactivate", "User", userId);
  revalidatePath("/admin/customers");
  revalidatePath("/admin/settings");
}

// ─── Discount codes ────────────────────────────────────────

const discountSchema = z
  .object({
    id: z.union([z.literal(""), idSchema]).optional(),
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,20}$/, "کد باید ۴ تا ۲۰ حرف انگلیسی یا عدد باشد"),
    type: z.enum(["PERCENT", "FIXED"]),
    value: int(100_000_000).pipe(z.number().min(1, "مقدار تخفیف را وارد کنید")),
    maxDiscount: z.union([z.literal(""), int(100_000_000)]),
    minOrder: z.union([z.literal(""), int(1_000_000_000)]),
    maxUses: z.union([z.literal(""), int(1_000_000)]),
    // Last valid Jalali day ("1405-09-10"), or empty for no end date.
    validTo: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
    active: z.literal("on").optional(),
  })
  .refine((d) => d.type !== "PERCENT" || d.value <= 90, { message: "درصد تخفیف حداکثر ۹۰ است", path: ["value"] });

/** The last day a code is valid, as shown in the panel ("1405-09-10"); null = no end date. */
const lastValidDay = (validTo: Date | null) => (validTo ? jKey(tehranJDate(new Date(validTo.getTime() - 1))) : null);

/** Creates a code, or updates one when `id` is sent (the edit window). */
export async function saveDiscount(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireStaff(["ADMIN"]);
  const parsed = discountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;
  const existing = d.id ? await db.discountCode.findUnique({ where: { id: d.id } }) : null;
  if (d.id && !existing) return { ok: false, error: "این کد پیدا نشد؛ شاید حذف شده است. صفحه را دوباره باز کنید." };

  const clash = await db.discountCode.findFirst({ where: { code: d.code, ...(existing ? { NOT: { id: existing.id } } : {}) }, select: { id: true } });
  if (clash) return { ok: false, error: "کد دیگری با همین نام وجود دارد." };
  if (existing && d.maxUses !== "" && d.maxUses < existing.usedCount) {
    return { ok: false, error: `این کد ${faDigits(existing.usedCount)} بار استفاده شده؛ حداکثر دفعات نمی‌تواند کمتر از آن باشد.` };
  }

  // Valid through the end of the chosen day (Tehran time). An unchanged date keeps its exact instant, so editing an
  // old code (or one that has already expired) never moves its end by accident.
  let validTo: Date | null = null;
  if (d.validTo) {
    if (existing && lastValidDay(existing.validTo) === d.validTo) validTo = existing.validTo;
    else {
      const day = parseJKey(d.validTo);
      if (!day) return { ok: false, error: "تاریخ انقضا معتبر نیست." };
      if (compareJ(day, tehranToday()) < 0) return { ok: false, error: "تاریخ انقضا نمی‌تواند گذشته باشد." };
      validTo = tehranDayStart(addDays(day, 1));
    }
  }

  const data = {
    code: d.code,
    type: d.type,
    value: d.value,
    maxDiscount: d.type === "PERCENT" && d.maxDiscount !== "" ? d.maxDiscount : null,
    minOrder: d.minOrder === "" ? 0 : d.minOrder,
    maxUses: d.maxUses === "" ? null : d.maxUses,
    validTo,
  };
  if (existing) {
    await db.discountCode.update({ where: { id: existing.id }, data: { ...data, isActive: d.active === "on" } });
    await audit(admin.id, "discount.update", "DiscountCode", existing.id, { code: data.code, ...(existing.code !== data.code ? { renamedFrom: existing.code } : {}) });
  } else {
    const row = await db.discountCode.create({ data });
    await audit(admin.id, "discount.create", "DiscountCode", row.id, { code: row.code });
  }
  revalidatePath("/admin/discounts");
  return { ok: true, message: existing ? `تغییرات کد ${data.code} ذخیره شد.` : `کد ${data.code} ساخته شد.` };
}

export async function toggleDiscount(id: string) {
  const admin = await requireStaff(["ADMIN"]);
  if (!idSchema.safeParse(id).success) return;
  const row = await db.discountCode.findUnique({ where: { id } });
  if (!row) return;
  await db.discountCode.update({ where: { id }, data: { isActive: !row.isActive } });
  await audit(admin.id, "discount.toggle", "DiscountCode", id, { active: !row.isActive });
  revalidatePath("/admin/discounts");
}

/** Orders keep the code's text, so deleting a code never changes an order. */
export async function deleteDiscount(id: string): Promise<AdminFormState> {
  const admin = await requireStaff(["ADMIN"]);
  if (!idSchema.safeParse(id).success) return { ok: false, error: "درخواست نامعتبر است." };
  const row = await db.discountCode.findUnique({ where: { id }, select: { code: true, usedCount: true } });
  if (!row) return { ok: false, error: "این کد پیدا نشد؛ شاید قبلاً حذف شده است." };
  await db.discountCode.delete({ where: { id } });
  await audit(admin.id, "discount.delete", "DiscountCode", id, { code: row.code, usedCount: row.usedCount });
  revalidatePath("/admin/discounts");
  return { ok: true, message: `کد ${row.code} حذف شد.` };
}

// ─── Tickets ───────────────────────────────────────────────

const replySchema = z.object({ ticketId: idSchema, body: text(3000, 2), close: z.string().optional() });

export async function staffReply(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  const parsed = replySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "متن پاسخ را وارد کنید." };
  const ticket = await db.ticket.findUnique({ where: { id: parsed.data.ticketId } });
  if (!ticket) return { ok: false, error: "تیکت یافت نشد." };
  await db.$transaction([
    db.ticketMessage.create({ data: { ticketId: ticket.id, body: parsed.data.body, authorId: staff.id, fromStaff: true } }),
    db.ticket.update({ where: { id: ticket.id }, data: { status: parsed.data.close === "on" ? "CLOSED" : "ANSWERED" } }),
    db.notification.create({
      data: { userId: ticket.userId, title: `پاسخ به تیکت #${ticket.number}`, body: "پشتیبانی به درخواست شما پاسخ داد.", href: `/profile/support/${ticket.number}` },
    }),
  ]);
  await audit(staff.id, "ticket.reply", "Ticket", ticket.id);
  revalidatePath(`/admin/tickets/${ticket.number}`);
  return { ok: true, message: "پاسخ ارسال شد." };
}

// ─── Settings ──────────────────────────────────────────────

const settingsSchema = z.object({
  enamad_id: z.union([z.literal(""), z.string().regex(/^\d{3,12}$/, "شناسه اینماد فقط عدد است")]),
  enamad_code: z.union([z.literal(""), z.string().regex(/^[A-Za-z0-9]{6,64}$/, "کد اینماد معتبر نیست")]),
});

export async function saveSettings(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireStaff(["ADMIN"]);
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  await db.$transaction(
    Object.entries(parsed.data).map(([key, value]) =>
      value ? db.setting.upsert({ where: { key }, create: { key, value }, update: { value } }) : db.setting.deleteMany({ where: { key } }),
    ),
  );
  await audit(admin.id, "settings.update", "Setting", undefined, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, message: "تنظیمات ذخیره شد." };
}

const coord = z.string().transform((v) => Number(toEnDigits(v).trim())).pipe(z.number().finite());

/** Saves (or clears) the shop pin shown on the contact page. */
export async function saveShopLocation(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireStaff(["ADMIN"]);
  if (formData.get("clear") === "1") {
    await db.setting.deleteMany({ where: { key: { in: ["shop_lat", "shop_lng"] } } });
    await audit(admin.id, "settings.location.clear", "Setting");
    revalidatePath("/contact");
    return { ok: true, message: "موقعیت فروشگاه حذف شد." };
  }
  const parsed = z.object({ lat: coord, lng: coord }).safeParse({ lat: formData.get("lat") ?? "", lng: formData.get("lng") ?? "" });
  if (!parsed.success || !inIran(parsed.data)) return { ok: false, error: "موقعیت معتبر نیست؛ نقطه را روی نقشه ایران انتخاب کنید." };
  const lat = String(roundCoord(parsed.data.lat));
  const lng = String(roundCoord(parsed.data.lng));
  await db.$transaction([
    db.setting.upsert({ where: { key: "shop_lat" }, create: { key: "shop_lat", value: lat }, update: { value: lat } }),
    db.setting.upsert({ where: { key: "shop_lng" }, create: { key: "shop_lng", value: lng }, update: { value: lng } }),
  ]);
  await audit(admin.id, "settings.location", "Setting", undefined, { lat, lng });
  revalidatePath("/contact");
  return { ok: true, message: "موقعیت فروشگاه ذخیره شد و در صفحه «تماس با ما» نمایش داده می‌شود." };
}
