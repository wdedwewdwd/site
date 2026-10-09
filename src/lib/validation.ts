import { z } from "zod";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Converts Persian/Arabic digits to ASCII. */
export function toEnDigits(input: string) {
  return input.replace(/[۰-۹٠-٩]/g, (d) => {
    const fa = FA_DIGITS.indexOf(d);
    return String(fa >= 0 ? fa : AR_DIGITS.indexOf(d));
  });
}

/** Normalizes Iranian mobile numbers to 09xxxxxxxxx, or returns null. */
export function normalizePhone(input: string) {
  let p = toEnDigits(input).replace(/[\s\-()]/g, "");
  if (p.startsWith("+98")) p = "0" + p.slice(3);
  else if (p.startsWith("0098")) p = "0" + p.slice(4);
  else if (p.startsWith("98") && p.length === 12) p = "0" + p.slice(2);
  else if (p.startsWith("9") && p.length === 10) p = "0" + p;
  return /^09\d{9}$/.test(p) ? p : null;
}

export const phoneSchema = z
  .string()
  .max(20)
  .transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "شماره موبایل معتبر نیست" });
      return z.NEVER;
    }
    return p;
  });

export const OTP_LENGTH = 6;
/** Staff sign in with a fixed numeric code (4–6 digits) typed into the same code form. */
export const MIN_CODE_LENGTH = 4;

export const otpSchema = z
  .string()
  .transform((v) => toEnDigits(v).replace(/\s/g, ""))
  .pipe(z.string().regex(new RegExp(`^\\d{${MIN_CODE_LENGTH},${OTP_LENGTH}}$`), "کد تأیید معتبر نیست"));

/** A staff member's fixed login code. */
/** New or changed staff codes must have 6 digits; older 4–5 digit codes still sign in (and get a warning). */
export const STAFF_CODE_LENGTH = 6;
/** Codes anyone would try first: one repeated digit or a straight run (123456, 987654). */
function guessableCode(code: string) {
  const d = [...code].map(Number);
  const steps = new Set(d.slice(1).map((n, i) => n - d[i]));
  return steps.size === 1 && [0, 1, -1].includes([...steps][0]);
}
export const staffCodeSchema = z
  .string()
  .regex(new RegExp(`^\\d{${STAFF_CODE_LENGTH}}$`), "کد ورود مدیران و پشتیبان‌ها باید ۶ رقم باشد")
  .refine((c) => !guessableCode(c), "این کد خیلی ساده است (مثل ۱۲۳۴۵۶ یا ۱۱۱۱۱۱)؛ کد دیگری انتخاب کنید");

/** Iranian postal codes are 10 digits. Optional: an empty value becomes null. */
export const optionalPostalCodeSchema = z
  .string()
  .optional()
  .transform((v) => toEnDigits(v ?? "").replace(/[\s-]/g, ""))
  .pipe(z.union([z.literal("").transform(() => null), z.string().regex(/^\d{10}$/, "کد پستی باید ۱۰ رقم باشد (یا خالی بگذارید)")]));

/** Trimmed text with a max length and no control characters. */
export const text = (max: number, min = 1) =>
  z
    .string()
    .transform((v) => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().min(min, "این فیلد الزامی است").max(max, `حداکثر ${max} کاراکتر`));

export const idSchema = z.string().regex(/^[a-z0-9]{20,32}$/i);
