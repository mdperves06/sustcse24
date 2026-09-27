import "server-only";
import { db } from "@/lib/db";
import { RateLimitError } from "@/lib/errors";

type Result = { allowed: boolean; remaining: number; resetAt: Date };

/**
 * Fixed-window rate limiter stored in PostgreSQL so it works across instances.
 * A single atomic upsert both increments and resets expired windows.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<Result> {
  const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO rate_limits ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN rate_limits."resetAt" <= now() THEN 1 ELSE rate_limits."count" + 1 END,
      "resetAt" = CASE WHEN rate_limits."resetAt" <= now() THEN EXCLUDED."resetAt" ELSE rate_limits."resetAt" END
    RETURNING "count", "resetAt"`;
  const row = rows[0]!;
  return { allowed: row.count <= limit, remaining: Math.max(0, limit - row.count), resetAt: row.resetAt };
}

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number, message?: string) {
  const result = await rateLimit(key, limit, windowSeconds);
  if (!result.allowed) throw new RateLimitError(message);
  return result;
}

export async function clearRateLimit(key: string) {
  await db.rateLimit.deleteMany({ where: { key } });
}
