"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { text, toEnDigits } from "@/lib/validation";
import { CONTACT_KEYS, parseInstagram, parsePhone, parseTelegram, parseWhatsapp, type ContactKey } from "@/lib/contact-shared";
import type { AdminFormState } from "./misc";

type Field = { key: ContactKey; label: string; required?: boolean; parse: (v: string) => string | null; error: string };

const trimmed = (max: number) => (v: string) => {
  const r = text(max, 0).safeParse(v);
  return r.success ? r.data : null;
};

const FIELDS: Field[] = [
  { key: "contact_phone", label: "تلفن پشتیبانی", required: true, parse: parsePhone, error: "تلفن پشتیبانی معتبر نیست (مثلاً ۰۲۱۳۳۹۴۷۲۷۰)" },
  { key: "contact_mobile", label: "موبایل پشتیبانی", parse: parsePhone, error: "شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۲۰۵۴۸۳۹)" },
  { key: "contact_hours", label: "ساعات پاسخگویی", required: true, parse: trimmed(60), error: "ساعات پاسخگویی حداکثر ۶۰ حرف است" },
  { key: "contact_email", label: "ایمیل", parse: (v) => (z.email().safeParse(v).success ? v.toLowerCase() : null), error: "ایمیل معتبر نیست" },
  { key: "contact_address", label: "نشانی", required: true, parse: trimmed(200), error: "نشانی حداکثر ۲۰۰ حرف است" },
  { key: "contact_postal", label: "کد پستی", parse: (v) => (/^\d{10}$/.test(toEnDigits(v).replace(/[\s-]/g, "")) ? toEnDigits(v).replace(/[\s-]/g, "") : null), error: "کد پستی باید ۱۰ رقم باشد" },
  { key: "social_instagram", label: "اینستاگرام", parse: parseInstagram, error: "آیدی یا لینک اینستاگرام معتبر نیست (مثلاً arizonyadak@)" },
  { key: "social_telegram", label: "تلگرام", parse: parseTelegram, error: "آیدی یا لینک تلگرام معتبر نیست (مثلاً arizonyadak@)" },
  { key: "social_whatsapp", label: "واتساپ", parse: parseWhatsapp, error: "شماره واتساپ معتبر نیست (شماره موبایل یا لینک wa.me)" },
];

/** Saves all contact details at once; empty optional fields hide that item on the site. */
export async function saveContact(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireStaff(["ADMIN"]);
  const values = {} as Record<ContactKey, string>;
  for (const f of FIELDS) {
    const raw = String(formData.get(f.key) ?? "").trim().slice(0, 300);
    if (!raw) {
      if (f.required) return { ok: false, error: `${f.label} را وارد کنید.` };
      values[f.key] = "";
      continue;
    }
    const parsed = f.parse(raw);
    if (!parsed) return { ok: false, error: f.error };
    values[f.key] = parsed;
  }
  if (Object.keys(values).length !== CONTACT_KEYS.length) return { ok: false, error: "اطلاعات ناقص است." };

  await db.$transaction(
    CONTACT_KEYS.map((key) => db.setting.upsert({ where: { key }, create: { key, value: values[key] }, update: { value: values[key] } })),
  );
  await audit(admin.id, "settings.contact", "Setting", undefined, values);
  revalidatePath("/", "layout");
  return { ok: true, message: "اطلاعات تماس ذخیره شد و در همه صفحات سایت اعمال شد." };
}
