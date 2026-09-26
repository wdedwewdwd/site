// Used by the Next.js server and by scripts/set-admin.ts, so it must not import "server-only".
import { createHmac, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const PARAMS = { N: 2 ** 15, r: 8, p: 1 };
const KEY_LEN = 64;

function derive(input: Buffer, salt: Buffer, opts: { N: number; r: number; p: number }) {
  const options: ScryptOptions = { ...opts, maxmem: 128 * opts.N * opts.r * 2 };
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(input, salt, KEY_LEN, options, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/**
 * The password is first keyed with a server-side pepper (not stored in the database),
 * so a leaked database alone is not enough to brute-force short passwords offline.
 */
function pepper(password: string, secret: string) {
  return createHmac("sha256", secret).update(password.normalize("NFKC")).digest();
}

export async function hashPassword(password: string, secret: string) {
  const salt = randomBytes(16);
  const key = await derive(pepper(password, secret), salt, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string, secret: string) {
  const [alg, n, r, p, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await derive(pepper(password, secret), Buffer.from(saltB64, "base64"), { N: Number(n), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}
