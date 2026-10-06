import "server-only";
import { db } from "../db";
import { env } from "../env";
import { hmac, numericCode, safeEqualHex } from "../crypto";
import { rateLimit } from "../rate-limit";
import { sendOtpSms } from "../sms";
import { OTP_LENGTH } from "../validation";

const OTP_TTL_MS = 2 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SEC = 90;

const hashCode = (phone: string, code: string) => hmac(env.OTP_PEPPER, `${phone}:${code}`);

type Result = { ok: true } | { ok: false; error: string };

export async function issueOtp(phone: string, ip: string): Promise<Result> {
  // Throttle per phone (SMS bombing) and per IP (enumeration / cost abuse).
  const [perPhoneShort, perPhoneHour, perIp, global] = await Promise.all([
    rateLimit(`otp:send:phone:${phone}`, 1, OTP_RESEND_SEC),
    rateLimit(`otp:send:phone-h:${phone}`, 5, 3600),
    rateLimit(`otp:send:ip:${ip}`, 15, 3600),
    // Backstop against SMS-cost abuse spread over many numbers and addresses; far above a shop's real traffic.
    rateLimit("otp:send:global", 400, 3600),
  ]);
  if (!perPhoneShort.ok) return { ok: false, error: `لطفاً ${perPhoneShort.retryAfterSec} ثانیه دیگر دوباره تلاش کنید.` };
  if (!perPhoneHour.ok || !perIp.ok || !global.ok) return { ok: false, error: "تعداد درخواست‌ها زیاد است. لطفاً بعداً تلاش کنید." };

  const code = numericCode(OTP_LENGTH);
  await db.$transaction([
    // Only the newest code is ever valid.
    db.otpCode.updateMany({ where: { phone, consumedAt: null }, data: { consumedAt: new Date() } }),
    db.otpCode.create({
      data: { phone, codeHash: hashCode(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MS), ip },
    }),
  ]);

  try {
    await sendOtpSms(phone, code);
  } catch (err) {
    console.error("OTP SMS failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "ارسال پیامک با خطا مواجه شد. لطفاً دوباره تلاش کنید." };
  }
  return { ok: true };
}

/** Returns true only if the code is correct; the code is burned on success or after too many attempts. */
export async function verifyOtp(phone: string, code: string, ip: string): Promise<Result> {
  const [perIp, perPhone] = await Promise.all([
    rateLimit(`otp:verify:ip:${ip}`, 30, 3600),
    rateLimit(`otp:verify:phone:${phone}`, 10, 900),
  ]);
  if (!perIp.ok || !perPhone.ok) return { ok: false, error: "تعداد تلاش‌ها زیاد است. لطفاً بعداً تلاش کنید." };

  const otp = await db.otpCode.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { ok: false, error: "کد منقضی شده است. لطفاً کد جدید دریافت کنید." };

  // Count the attempt before checking, so parallel guesses can't exceed the limit.
  const counted = await db.otpCode.updateMany({
    where: { id: otp.id, consumedAt: null, attempts: { lt: OTP_MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  if (counted.count === 0) {
    await db.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    return { ok: false, error: "تعداد تلاش‌ها بیش از حد مجاز است. کد جدید دریافت کنید." };
  }

  if (!safeEqualHex(otp.codeHash, hashCode(phone, code))) {
    return { ok: false, error: "کد وارد شده صحیح نیست." };
  }

  // Burn the code atomically; a concurrent request that also matched will lose this race.
  const burned = await db.otpCode.updateMany({
    where: { id: otp.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (burned.count === 0) return { ok: false, error: "کد قبلاً استفاده شده است." };
  return { ok: true };
}
