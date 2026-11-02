import "server-only";
import { db } from "./db";
import { env } from "./env";
import { hashPassword, verifyPassword } from "./password";

/**
 * Checks a staff member's fixed login code. While OTP_PEPPER is being changed (OTP_PEPPER_PREVIOUS set), a code
 * hashed with the old pepper still matches and is re-hashed under the new one on the spot, so nobody has to pick a
 * new code. `npm run secrets:reseal -- --status` shows who has signed in since; then OTP_PEPPER_PREVIOUS is removed.
 */
export async function checkStaffCode(userId: string, code: string, stored: string) {
  if (await verifyPassword(code, stored, env.OTP_PEPPER)) return true;
  if (!env.OTP_PEPPER_PREVIOUS || !(await verifyPassword(code, stored, env.OTP_PEPPER_PREVIOUS))) return false;
  // Only if the code was not changed meanwhile.
  const moved = await db.user.updateMany({ where: { id: userId, passwordHash: stored }, data: { passwordHash: await hashPassword(code, env.OTP_PEPPER) } });
  if (moved.count) await db.auditLog.create({ data: { actorId: userId, action: "admin.code.rehashed", entity: "User", entityId: userId } });
  return true;
}
