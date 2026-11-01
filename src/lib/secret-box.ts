import "server-only";
import { env } from "./env";
import { sealWith, unsealWith } from "./secret-box-core";

/**
 * Encrypts small secrets that admins save in the database (e.g. the SMS provider's API key), so they are
 * not readable in the database or in backups. The key is derived from OTP_PEPPER, which lives only in the
 * server's environment. When OTP_PEPPER is changed, `npm run secrets:reseal` re-encrypts them under the new value
 * (scripts/rotate-pepper.ts); until then OTP_PEPPER_PREVIOUS still opens them.
 */
export function seal(plain: string) {
  return sealWith(env.OTP_PEPPER, plain);
}

/** The secret, or null if it is missing, tampered with or was sealed under another OTP_PEPPER. */
export function unseal(sealed: string | null | undefined): string | null {
  return unsealWith(env.OTP_PEPPER, sealed) ?? (env.OTP_PEPPER_PREVIOUS ? unsealWith(env.OTP_PEPPER_PREVIOUS, sealed) : null);
}
