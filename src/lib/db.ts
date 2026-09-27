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

// Development: reuse one client per generated-client class across hot reloads. Keying by
// class means a regenerated client (after a schema change) gets a fresh instance, while
// bundles that share the same class (pages, route handlers) share one connection pool.
// Old instances are never disconnected here — other bundles may still be using them.
const globalForPrisma = globalThis as unknown as { prismaClients?: WeakMap<object, ReturnType<typeof create>> };

function devClient() {
  const clients = (globalForPrisma.prismaClients ??= new WeakMap());
  let client = clients.get(PrismaClient);
  if (!client) {
    client = create();
    clients.set(PrismaClient, client);
  }
  return client;
}

export const db = isProd ? create() : devClient();
