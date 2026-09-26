import "server-only";
import { db } from "./db";

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

/**
 * Fixed-window rate limit backed by Postgres, so it holds across multiple
 * app instances and restarts. The upsert is a single atomic statement.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const rows = await db.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec})
                     THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec})
                     THEN now() ELSE "RateLimit"."windowStart" END
    RETURNING "count", "windowStart"`;

  const { count, windowStart } = rows[0];
  const elapsed = (Date.now() - windowStart.getTime()) / 1000;
  return { ok: count <= limit, retryAfterSec: Math.max(1, Math.ceil(windowSec - elapsed)) };
}

