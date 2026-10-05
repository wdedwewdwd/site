"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { shippingConfigSchema } from "@/lib/shipping-shared";

export type ShippingSaveResult = { ok: true; message: string } | { ok: false; message: string };

/** Saves every shipping method at once (titles, prices, switches and order); checkout uses it immediately. */
export async function saveShippingSettings(input: unknown): Promise<ShippingSaveResult> {
  const admin = await requireStaff(["ADMIN"]);
  const parsed = shippingConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const value = JSON.stringify(parsed.data);
  await db.setting.upsert({ where: { key: "shipping_config" }, create: { key: "shipping_config", value }, update: { value } });
  await audit(admin.id, "settings.shipping", "Setting", undefined, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, message: "روش‌های ارسال ذخیره شد و از همین حالا در صفحه پرداخت اعمال می‌شود." };
}
