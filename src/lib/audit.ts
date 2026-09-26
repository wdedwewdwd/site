import "server-only";
import { db } from "./db";
import { clientIp } from "./request";
import type { Prisma } from "@/generated/prisma/client";

/** Records every privileged action for accountability. */
export async function audit(actorId: string, action: string, entity?: string, entityId?: string, meta?: Prisma.InputJsonValue) {
  await db.auditLog.create({ data: { actorId, action, entity, entityId, meta, ip: await clientIp() } });
}
