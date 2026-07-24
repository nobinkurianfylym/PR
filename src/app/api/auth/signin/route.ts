import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { createSession, verifyPassword } from "@/server/auth";
import { clientIp, rateLimit } from "@/server/rate-limit";

export async function POST(req: Request) {
  const { email, password } = (await req.json()) as { email?: string; password?: string };
  if (!email || !password) return NextResponse.json({ error: "Missing credentials" }, { status: 400 });

  // Throttle brute-force: per IP and per targeted account.
  const ip = await clientIp();
  const norm = email.toLowerCase();
  const [ipOk, emailOk] = await Promise.all([
    rateLimit(`signin:ip:${ip}`, 15, 300),
    rateLimit(`signin:email:${norm}`, 6, 300),
  ]);
  if (!ipOk || !emailOk) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const user = await db()
    .prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<{ id: string; name: string; email: string; password_hash: string }>();
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
}
