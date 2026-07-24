import { headers } from "next/headers";
import { db } from "./db";

/** The caller's IP, from Cloudflare's trusted header. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Fixed-window rate limit backed by D1. Returns true if the action is allowed,
 * false if the bucket is over its limit for the current window. Deliberately
 * simple (not perfectly atomic) — it's abuse mitigation, not a hard quota.
 */
export async function rateLimit(
  bucket: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const database = db();
  try {
    const row = await database
      .prepare("SELECT count, reset_at FROM rate_limits WHERE bucket = ?")
      .bind(bucket)
      .first<{ count: number; reset_at: number }>();

    if (!row || row.reset_at <= now) {
      await database
        .prepare(
          `INSERT INTO rate_limits (bucket, count, reset_at) VALUES (?,1,?)
           ON CONFLICT(bucket) DO UPDATE SET count = 1, reset_at = excluded.reset_at`,
        )
        .bind(bucket, now + windowSec)
        .run();
      return true;
    }
    if (row.count >= limit) return false;
    await database
      .prepare("UPDATE rate_limits SET count = count + 1 WHERE bucket = ?")
      .bind(bucket)
      .run();
    return true;
  } catch {
    // Never let the limiter itself take the endpoint down.
    return true;
  }
}
