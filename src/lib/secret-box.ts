import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { env } from "./env";

/**
 * Encrypts small secrets that admins save in the database (e.g. the SMS provider's API key), so they are
 * not readable in the database or in backups. The key is derived from OTP_PEPPER, which lives only in the
 * server's environment; changing OTP_PEPPER means such secrets have to be entered again.
 */
const key = () => Buffer.from(hkdfSync("sha256", env.OTP_PEPPER, "arizon", "settings-secret-v1", 32));

export function seal(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

/** The secret, or null if it is missing, tampered with or was sealed under another OTP_PEPPER. */
export function unseal(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !body) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
