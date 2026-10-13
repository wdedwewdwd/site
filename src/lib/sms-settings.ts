import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";
import { seal, unseal } from "./secret-box";

/**
 * Login-code SMS through Faraz SMS / Iran Payamak, set up by the owner at /admin/sms. Kept apart from the
 * general settings (getSettings) so the API key never travels to pages; it is stored encrypted.
 * Until it is switched on, login codes go to the provider configured in the environment (on the live
 * server today: the server log).
 */
export const SMS_KEYS = ["sms_active", "sms_api_key", "sms_pattern", "sms_pattern_var", "sms_line", "sms_tested"] as const;
type SmsKey = (typeof SMS_KEYS)[number];

export type SmsConfig = {
  active: boolean;
  apiKey: string | null;
  /** The saved key could not be decrypted (e.g. OTP_PEPPER changed): it has to be entered again. */
  keyUnreadable: boolean;
  pattern: string;
  variable: string;
  line: string;
  /** A test message went through with exactly these settings, so they may be switched on. */
  tested: boolean;
};

/** Fingerprint of everything a send depends on; a successful test stores it, any change invalidates it. */
export const configFingerprint = (c: { apiKey: string | null; pattern: string; variable: string; line: string }) =>
  createHash("sha256").update(JSON.stringify([c.apiKey, c.pattern, c.variable, c.line])).digest("hex");

export async function getSmsConfig(): Promise<SmsConfig> {
  const rows = await db.setting.findMany({ where: { key: { in: [...SMS_KEYS] } } });
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<Record<SmsKey, string>>;
  const apiKey = unseal(s.sms_api_key);
  const base = { apiKey, pattern: s.sms_pattern ?? "", variable: s.sms_pattern_var || "code", line: s.sms_line ?? "" };
  const tested = !!s.sms_tested && s.sms_tested === configFingerprint(base);
  return { ...base, keyUnreadable: !!s.sms_api_key && !apiKey, tested, active: s.sms_active === "1" && tested && !!apiKey };
}

export async function saveSmsSettings(values: { apiKey?: string; pattern: string; variable: string; line: string }) {
  const writes: [SmsKey, string][] = [
    ["sms_pattern", values.pattern],
    ["sms_pattern_var", values.variable],
    ["sms_line", values.line],
  ];
  if (values.apiKey) writes.push(["sms_api_key", seal(values.apiKey)]);
  await db.$transaction(writes.map(([key, value]) => db.setting.upsert({ where: { key }, create: { key, value }, update: { value } })));
}

export async function setSmsFlag(key: "sms_active" | "sms_tested", value: string | null) {
  if (value === null) await db.setting.deleteMany({ where: { key } });
  else await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}
