// Used by the Next.js server (through secret-box.ts) and by scripts/rotate-pepper.ts, so it must not import "server-only".
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const key = (pepper: string) => Buffer.from(hkdfSync("sha256", pepper, "arizon", "settings-secret-v1", 32));

/** Sealed values look like `v1.<iv>.<tag>.<body>`. */
export const SEALED = /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function sealWith(pepper: string, plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(pepper), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

/** The secret, or null if it is missing, tampered with or was sealed under another pepper. */
export function unsealWith(pepper: string, sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !body) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(pepper), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
