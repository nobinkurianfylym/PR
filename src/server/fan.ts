import { cookies } from "next/headers";
import { db } from "./db";

/**
 * Fan identity on a public fan page. A fan isn't a full account — they join
 * with an email — so we remember them per film with an HttpOnly cookie holding
 * their fan id. That cookie is the only thing that attributes a share to a fan,
 * so points can't be farmed by a client posting arbitrary ids. Email
 * verification (magic link) upgrades a fan to "verified" for prize eligibility.
 */
export const POINTS = {
  join: 20,
  share: 10,
  refer: 15,
} as const;

export function fanCookieName(filmId: string): string {
  return `pr_fan_${filmId}`;
}
export function refCookieName(filmId: string): string {
  return `pr_ref_${filmId}`;
}
export function visitorCookieName(filmId: string): string {
  return `pr_vid_${filmId}`;
}

export async function setFanCookie(filmId: string, fanId: string): Promise<void> {
  (await cookies()).set(fanCookieName(filmId), fanId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export interface FanRecord {
  id: string;
  name: string;
  email: string;
  points: number;
  shares: number;
  verified: number;
  ref_joins: number;
  ref_visits: number;
}

/** The signed-in fan for this film, verified against the DB, or null. */
export async function currentFan(filmId: string): Promise<FanRecord | null> {
  const id = (await cookies()).get(fanCookieName(filmId))?.value;
  if (!id) return null;
  const fan = await db()
    .prepare(
      "SELECT id, name, email, points, shares, verified, ref_joins, ref_visits FROM fans WHERE id = ? AND film_id = ?",
    )
    .bind(id, filmId)
    .first<FanRecord>();
  return fan ?? null;
}

/** A fan's 1-based rank within their film, by points then earliest joined. */
export async function fanRank(filmId: string, fanId: string): Promise<number | null> {
  const row = await db()
    .prepare(
      `SELECT COUNT(*) + 1 AS rank FROM fans
        WHERE film_id = ? AND (points > (SELECT points FROM fans WHERE id = ?)
          OR (points = (SELECT points FROM fans WHERE id = ?)
              AND created_at < (SELECT created_at FROM fans WHERE id = ?)))`,
    )
    .bind(filmId, fanId, fanId, fanId)
    .first<{ rank: number }>();
  return row?.rank ?? null;
}

/**
 * Award points for an action, once per (fan, kind, detail). Returns the points
 * granted (0 if it was a repeat). Keeps fans.points/shares in step.
 */
export async function award(
  filmId: string,
  fanId: string,
  kind: "join" | "share" | "refer",
  detail: string,
): Promise<number> {
  const pts = POINTS[kind];
  const database = db();
  const res = (await database
    .prepare(
      `INSERT OR IGNORE INTO fan_actions (id, fan_id, film_id, kind, detail, points)
       VALUES (?,?,?,?,?,?)`,
    )
    .bind(crypto.randomUUID(), fanId, filmId, kind, detail.slice(0, 200), pts)
    .run()) as { meta?: { changes?: number } };

  const granted = res.meta?.changes ? pts : 0;
  if (granted > 0) {
    await database
      .prepare("UPDATE fans SET points = points + ?, shares = shares + ? WHERE id = ?")
      .bind(granted, kind === "share" ? 1 : 0, fanId)
      .run();
  }
  return granted;
}

/**
 * Attribute a pending referral (from the ref cookie) to a fan who just joined:
 * credits the referrer with points and a "fan brought" count, once. Ignores
 * self-referral and fans already referred.
 */
export async function attributeReferral(filmId: string, newFanId: string): Promise<void> {
  const store = await cookies();
  const referrerId = store.get(refCookieName(filmId))?.value;
  store.delete(refCookieName(filmId));
  if (!referrerId || referrerId === newFanId) return;

  const database = db();
  const referrer = await database
    .prepare("SELECT id FROM fans WHERE id = ? AND film_id = ?")
    .bind(referrerId, filmId)
    .first<{ id: string }>();
  if (!referrer) return;

  await database
    .prepare("UPDATE fans SET referred_by = ? WHERE id = ? AND referred_by = ''")
    .bind(referrerId, newFanId)
    .run();
  await database
    .prepare(
      "UPDATE fan_referrals SET joined_fan_id = ? WHERE film_id = ? AND referrer_id = ? AND joined_fan_id = ''",
    )
    .bind(newFanId, filmId, referrerId)
    .run();
  await database
    .prepare("UPDATE fans SET ref_joins = ref_joins + 1 WHERE id = ?")
    .bind(referrerId)
    .run();
  await award(filmId, referrerId, "refer", newFanId);
}

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Mint a magic-link token for a fan (30-minute life). Returns the raw token. */
export async function mintFanToken(filmId: string, fanId: string): Promise<string> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await db()
    .prepare("INSERT INTO fan_tokens (token_hash, fan_id, film_id, expires_at) VALUES (?,?,?,?)")
    .bind(await sha256(token), fanId, filmId, expires)
    .run();
  return token;
}

/**
 * Consume a magic-link token: if valid, logs the fan in on this device and
 * marks them verified. Returns the fan id, or null.
 */
export async function consumeFanToken(filmId: string, token: string): Promise<string | null> {
  const database = db();
  const hash = await sha256(token);
  const row = await database
    .prepare(
      "SELECT fan_id FROM fan_tokens WHERE token_hash = ? AND film_id = ? AND expires_at > datetime('now')",
    )
    .bind(hash, filmId)
    .first<{ fan_id: string }>();
  if (!row) return null;
  await database.prepare("DELETE FROM fan_tokens WHERE token_hash = ?").bind(hash).run();
  await database.prepare("UPDATE fans SET verified = 1 WHERE id = ?").bind(row.fan_id).run();
  await setFanCookie(filmId, row.fan_id);
  return row.fan_id;
}
