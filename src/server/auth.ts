import { cookies } from "next/headers";
import { db } from "./db";

/**
 * Cookie-session auth on Web Crypto only (no native modules — this runs in a
 * Cloudflare Worker). Passwords: PBKDF2-SHA256, 100k iterations, per-user
 * salt. Sessions: random token in an HttpOnly cookie, SHA-256 hash at rest.
 */
const SESSION_COOKIE = "pr_fylym_session";
const SESSION_DAYS = 30;

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function pbkdf2(password: string, saltHex: string): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 },
    key,
    256,
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer);
  return `${salt}:${await pbkdf2(password, salt)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  return (await pbkdf2(password, salt)) === hash;
}

async function sha256(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(value)));
}

export async function createSession(userId: string): Promise<void> {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer);
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db()
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256(token), userId, expires.toISOString())
    .run();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await db()
    .prepare(
      `SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > datetime('now')`,
    )
    .bind(await sha256(token))
    .first<SessionUser>();
  return row ?? null;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  }
  store.delete(SESSION_COOKIE);
}
