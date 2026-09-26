import "server-only";
import { env, isProd } from "./env";

/** Sends a one-time login code. Throws if the provider rejects the request. */
export async function sendOtpSms(phone: string, code: string) {
  if (env.SMS_PROVIDER === "console") {
    if (isProd && env.ALLOW_CONSOLE_SMS !== "true") throw new Error("console SMS provider is disabled in production");
    console.info(`[dev-sms] OTP for ${phone}: ${code}`);
    return;
  }

  // Kavenegar "verify/lookup" uses a pre-approved template, so the text cannot be abused for spam.
  const url = new URL(
    `https://api.kavenegar.com/v1/${encodeURIComponent(env.KAVENEGAR_API_KEY!)}/verify/lookup.json`,
  );
  url.searchParams.set("receptor", phone);
  url.searchParams.set("token", code);
  url.searchParams.set("template", env.KAVENEGAR_OTP_TEMPLATE!);

  const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!res.ok) throw new Error(`SMS provider error: ${res.status}`);
}
