/**
 * Changing OTP_PEPPER (e.g. because the old value was seen somewhere it should not be):
 *
 *   1. In the server's .env, move the old value to OTP_PEPPER_PREVIOUS and put a new random one in OTP_PEPPER
 *      (`openssl rand -base64 48`), then restart the site.
 *   2. npm run secrets:reseal              re-encrypts the secrets saved in Settings (e.g. the SMS API key)
 *                                          under the new OTP_PEPPER and records when the change started.
 *   3. Staff codes can't be re-hashed without the codes themselves: each one is re-hashed on that person's
 *      next sign-in (src/lib/staff-code.ts). Check with:
 *      npm run secrets:reseal -- --status
 *   4. When everyone is done, delete OTP_PEPPER_PREVIOUS from .env and restart. Anyone who has not signed in
 *      by then needs a new code (Settings → «مدیران و پشتیبان‌ها», or `npm run admin:set`).
 *
 * Nothing secret is printed: only setting names, masked phone numbers and counts.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { SEALED, sealWith, unsealWith } from "../src/lib/secret-box-core";

const STARTED_KEY = "pepper_rotated_at";
const mask = (phone: string) => phone.slice(0, 4) + "*****" + phone.slice(-2);

async function main() {
  const current = process.env.OTP_PEPPER;
  const previous = process.env.OTP_PEPPER_PREVIOUS || undefined;
  if (!current || current.length < 32) throw new Error("OTP_PEPPER must be set.");
  if (previous && previous === current) throw new Error("OTP_PEPPER_PREVIOUS is the same as OTP_PEPPER.");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }) });
  try {
    if (process.argv.includes("--status")) {
      const started = (await db.setting.findUnique({ where: { key: STARTED_KEY } }))?.value;
      console.log(previous ? "OTP_PEPPER_PREVIOUS is set (change in progress)." : "OTP_PEPPER_PREVIOUS is not set.");
      console.log(`Change started: ${started ?? "never recorded"}`);
      if (!started) return;
      const since = new Date(started);
      const staff = await db.user.findMany({
        where: { role: { in: ["ADMIN", "SUPPORT"] }, passwordHash: { not: null } },
        select: { id: true, phone: true, role: true },
      });
      let waiting = 0;
      for (const s of staff) {
        // Re-hashed at sign-in, changed by themselves, or given a new code by an admin after the change started.
        const done = await db.auditLog.count({
          where: {
            createdAt: { gte: since },
            OR: [
              { actorId: s.id, action: { in: ["admin.code.rehashed", "admin.password.change"] } },
              { entityId: s.id, action: "staff.add" },
              { entityId: s.id, action: "staff.update", meta: { path: ["codeChanged"], equals: true } },
            ],
          },
        });
        if (!done) waiting++;
        console.log(`  ${mask(s.phone)} ${s.role.padEnd(7)} ${done ? "done" : "waiting for next sign-in"}`);
      }
      console.log(waiting ? `${waiting} staff account(s) still use the old pepper.` : "Every staff account uses the new pepper: OTP_PEPPER_PREVIOUS can be removed.");
      return;
    }

    if (!previous) throw new Error("Set OTP_PEPPER_PREVIOUS to the old value first (see the comment at the top of this file).");
    const rows = await db.setting.findMany({ select: { key: true, value: true } });
    let moved = 0;
    for (const { key, value } of rows) {
      if (!SEALED.test(value)) continue;
      if (unsealWith(current, value) !== null) {
        console.log(`  ${key}: already under the new pepper`);
        continue;
      }
      const plain = unsealWith(previous, value);
      if (plain === null) {
        console.log(`  ${key}: opens with neither pepper (has to be entered again in the panel)`);
        continue;
      }
      // Only if nobody saved a new value meanwhile.
      const res = await db.setting.updateMany({ where: { key, value }, data: { value: sealWith(current, plain) } });
      moved += res.count;
      console.log(`  ${key}: ${res.count ? "re-encrypted under the new pepper" : "changed meanwhile, skipped"}`);
    }
    const started = await db.setting.findUnique({ where: { key: STARTED_KEY } });
    if (!started) await db.setting.create({ data: { key: STARTED_KEY, value: new Date().toISOString() } });
    console.log(`${moved} saved secret(s) moved. Staff codes move at each person's next sign-in (--status).`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
