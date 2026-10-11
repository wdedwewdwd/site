import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env, isProd } from "./env";

function create() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    // A 40-customer test (sign-in, cart, checkout at once) exhausted 10 connections; PostgreSQL allows 100.
    max: 20,
    // Recycle idle sockets so connections dropped by the server/proxy are not reused.
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({
    adapter,
    log: isProd ? ["error"] : ["error", "warn"],
    // Under a rush, a transaction (checkout, sign-in) waits for a free connection instead of failing after
    // Prisma's default 2 s; it still has its own time limit once started.
    transactionOptions: { maxWait: 10_000, timeout: 15_000 },
  });
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
