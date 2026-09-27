"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { idSchema, text, toEnDigits } from "@/lib/validation";

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
}

export async function setUserRole(userId: string, role: "CUSTOMER" | "SUPPORT" | "ADMIN") {
  const admin = await requireStaff(["ADMIN"]);
  if (!idSchema.safeParse(userId).success || userId === admin.id) return;
  if (!["CUSTOMER", "SUPPORT", "ADMIN"].includes(role)) return;
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { role } }),
    // Privilege changes invalidate existing sessions.
    db.session.deleteMany({ where: { userId } }),
  ]);
  await audit(admin.id, "user.role", "User", userId, { role });
  revalidatePath("/admin/customers");
}

// ─── Discount codes ────────────────────────────────────────

const discountSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,20}$/, "کد باید ۴ تا ۲۰ حرف انگلیسی یا عدد باشد"),
    type: z.enum(["PERCENT", "FIXED"]),
    value: int(100_000_000).pipe(z.number().min(1, "مقدار تخفیف را وارد کنید")),
    maxDiscount: z.union([z.literal(""), int(100_000_000)]),
    minOrder: z.union([z.literal(""), int(1_000_000_000)]),
    maxUses: z.union([z.literal(""), int(1_000_000)]),
    validDays: z.union([z.literal(""), int(3650)]),
  })
  .refine((d) => d.type !== "PERCENT" || d.value <= 90, { message: "درصد تخفیف حداکثر ۹۰ است", path: ["value"] });

export async function createDiscount(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireStaff(["ADMIN"]);
  const parsed = discountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;
  if (await db.discountCode.findUnique({ where: { code: d.code } })) return { ok: false, error: "این کد قبلاً ساخته شده است." };
  const row = await db.discountCode.create({
    data: {
      code: d.code,
      type: d.type,
      value: d.value,
      maxDiscount: d.maxDiscount === "" ? null : d.maxDiscount,
      minOrder: d.minOrder === "" ? 0 : d.minOrder,
      maxUses: d.maxUses === "" ? null : d.maxUses,
      validTo: d.validDays === "" ? null : new Date(Date.now() + d.validDays * 86_400_000),
    },
  });
  await audit(admin.id, "discount.create", "DiscountCode", row.id, { code: row.code });
  revalidatePath("/admin/discounts");
  return { ok: true, message: "کد تخفیف ساخته شد." };
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
