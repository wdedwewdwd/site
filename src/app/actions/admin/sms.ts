"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { numericCode } from "@/lib/crypto";
import { maskPhone } from "@/lib/format";
import { sendPattern } from "@/lib/iranpayamak";
import { rateLimit } from "@/lib/rate-limit";
import { configFingerprint, getSmsConfig, saveSmsSettings, setSmsFlag } from "@/lib/sms-settings";
import { OTP_LENGTH, phoneSchema, toEnDigits } from "@/lib/validation";

export type SmsFormState = { ok: boolean; message: string } | null;

const settingsSchema = z.object({
  // Empty = keep the saved key.
  apiKey: z.string().trim().max(300).refine((v) => v === "" || /^[\x21-\x7e]{10,300}$/.test(v), "کلید API معتبر نیست؛ آن را کامل و بدون فاصله کپی کنید."),
  pattern: z.string().trim().regex(/^[A-Za-z0-9_-]{3,40}$/, "کد پترن معتبر نیست (مثلاً SJ3FgPrE0C)."),
  variable: z.string().trim().regex(/^[A-Za-z_][A-Za-z0-9_]{0,30}$/, "نام متغیر پترن فقط حروف انگلیسی باشد (مثلاً code)."),
  line: z
    .string()
    .transform((v) => toEnDigits(v).replace(/[\s+-]/g, ""))
    .pipe(z.string().regex(/^\d{4,20}$/, "شماره خط ارسال معتبر نیست (فقط رقم، مثلاً 90008361).")),
});

/** Saves the Faraz SMS connection. Any change switches SMS login off until a new test succeeds. */
export async function saveSmsSettingsAction(_: SmsFormState, formData: FormData): Promise<SmsFormState> {
  const admin = await requireStaff(["ADMIN"]);
  const parsed = settingsSchema.safeParse({
    apiKey: String(formData.get("apiKey") ?? ""),
    pattern: String(formData.get("pattern") ?? ""),
    variable: String(formData.get("variable") ?? "") || "code",
    line: String(formData.get("line") ?? ""),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;

  const before = await getSmsConfig();
  if (!d.apiKey && !before.apiKey) return { ok: false, message: "کلید API را وارد کنید." };
  const after = { apiKey: d.apiKey || before.apiKey, pattern: d.pattern, variable: d.variable, line: d.line };
  const changed = configFingerprint(after) !== configFingerprint(before);

  await saveSmsSettings({ apiKey: d.apiKey || undefined, pattern: d.pattern, variable: d.variable, line: d.line });
  if (changed) {
    await setSmsFlag("sms_active", null);
    await setSmsFlag("sms_tested", null);
  }
  await audit(admin.id, "settings.sms", "Setting", undefined, { pattern: d.pattern, variable: d.variable, line: d.line, keyChanged: !!d.apiKey });
  revalidatePath("/admin/sms");
  return { ok: true, message: changed ? "ذخیره شد. حالا یک پیامک آزمایشی بفرستید." : "ذخیره شد (تغییری نداشت)." };
}

/** Sends a real login-style message with the saved settings; success marks them as tested. */
export async function testSmsAction(_: SmsFormState, formData: FormData): Promise<SmsFormState> {
  const admin = await requireStaff(["ADMIN"]);
  const phone = phoneSchema.safeParse(String(formData.get("phone") ?? ""));
  if (!phone.success) return { ok: false, message: "شماره موبایل معتبر نیست." };
  const rl = await rateLimit(`sms:test:${admin.id}`, 10, 3600);
  if (!rl.ok) return { ok: false, message: "تعداد پیامک‌های آزمایشی زیاد است؛ کمی بعد دوباره امتحان کنید." };

  const config = await getSmsConfig();
  if (!config.apiKey || !config.pattern || !config.line) return { ok: false, message: "اول تنظیمات اتصال را کامل و ذخیره کنید." };
  const code = numericCode(OTP_LENGTH);
  const res = await sendPattern(config.apiKey, { pattern: config.pattern, variable: config.variable, value: code, line: config.line, phone: phone.data });
  await audit(admin.id, "sms.test", "Setting", undefined, { phone: maskPhone(phone.data), ok: res.ok, error: res.ok ? undefined : res.error });
  if (!res.ok) return { ok: false, message: res.error };

  await setSmsFlag("sms_tested", configFingerprint(config));
  revalidatePath("/admin/sms");
  return { ok: true, message: `پیامک با کد ${code} به ${maskPhone(phone.data)} فرستاده شد. اگر رسید، «ورود با پیامک» را روشن کنید.` };
}

/** Switches login codes between Faraz SMS and the previous provider (server log). */
export async function setSmsActiveAction(active: boolean): Promise<SmsFormState> {
  const admin = await requireStaff(["ADMIN"]);
  const config = await getSmsConfig();
  if (active && !config.tested) return { ok: false, message: "اول با همین تنظیمات یک پیامک آزمایشی موفق بفرستید." };
  await setSmsFlag("sms_active", active ? "1" : null);
  await audit(admin.id, active ? "sms.activate" : "sms.deactivate", "Setting");
  revalidatePath("/admin/sms");
  return { ok: true, message: active ? "ورود با پیامک فعال شد؛ کدهای ورود مشتریان از این به بعد پیامک می‌شوند." : "ورود با پیامک خاموش شد." };
}
