/**
 * Creates or updates a staff account and sets its fixed login code (4–6 digits).
 * The staff member types this code on the normal login form instead of an SMS code.
 * This is the only way to create an admin: it needs shell access to the server.
 *
 *   npm run admin:set -- 09121234567            (asks for the code)
 *   echo "123456" | npm run admin:set -- 09121234567
 *
 * Optional: --role=SUPPORT (default ADMIN).
 */
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import { normalizePhone, staffCodeSchema, toEnDigits } from "../src/lib/validation";

async function readPassword() {
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const c of process.stdin) chunks.push(c as Buffer);
    return Buffer.concat(chunks).toString("utf8").trim();
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const pw = await rl.question("Login code (4-6 digits): ");
  rl.close();
  return pw.trim();
}

async function main() {
  const args = process.argv.slice(2);
  const phone = normalizePhone(args.find((a) => !a.startsWith("--")) ?? "");
  const role = args.includes("--role=SUPPORT") ? "SUPPORT" : "ADMIN";
  if (!phone) throw new Error("Usage: npm run admin:set -- 09xxxxxxxxx [--role=SUPPORT]");
  const pepper = process.env.OTP_PEPPER;
  if (!pepper || pepper.length < 32) throw new Error("OTP_PEPPER must be set (same value as the running site).");

  const password = toEnDigits(await readPassword());
  if (!staffCodeSchema.safeParse(password).success) throw new Error("The login code must be 4 to 6 digits.");
  if (password.length < 6) console.warn("WARNING: a 6-digit code is much harder to guess than a shorter one.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const passwordHash = await hashPassword(password, pepper);
    const user = await db.user.upsert({
      where: { phone },
      create: { phone, role, passwordHash },
      update: { role, passwordHash, isActive: true },
    });
    // A password change signs the account out everywhere.
    await db.session.deleteMany({ where: { userId: user.id } });
    await db.auditLog.create({ data: { actorId: user.id, action: "admin.password.set", meta: { via: "cli", role } } });
    console.log(`OK: ${phone} is ${role}. Sign in on the normal login page with this code.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
