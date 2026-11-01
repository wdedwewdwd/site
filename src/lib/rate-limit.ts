import "server-only";
import { db } from "./db";

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

/**
 * Fixed-window rate limit backed by Postgres, so it holds across multiple
 * app instances and restarts. The upsert is a single atomic statement.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  // The window's age is measured in SQL as well: "windowStart" holds the database's local time (now()), so comparing
  // it with Date.now() was off by the server's time zone (3.5 h in Tehran: «wait 12686 seconds» for a 90 s limit).
  const rows = await db.$queryRaw<{ count: number; elapsed: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec})
                     THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec})
                     THEN now() ELSE "RateLimit"."windowStart" END
    RETURNING "count", EXTRACT(EPOCH FROM (now() - "windowStart"))::float8 AS "elapsed"`;

  const { count, elapsed } = rows[0];
  return { ok: count <= limit, retryAfterSec: Math.max(1, Math.ceil(windowSec - Number(elapsed))) };
}

