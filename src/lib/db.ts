import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env, isProd } from "./env";

function create() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    max: 10,
    // Recycle idle sockets so connections dropped by the server/proxy are not reused.
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter, log: isProd ? ["error"] : ["error", "warn"] });
}

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof create> };

export const db = globalForPrisma.prisma ?? create();
if (!isProd) globalForPrisma.prisma = db;
