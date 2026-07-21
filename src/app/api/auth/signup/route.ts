import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { createSession, hashPassword } from "@/server/auth";

export async function POST(req: Request) {
  const { name, email, password } = (await req.json()) as {
    name?: string; email?: string; password?: string;
  };
  if (!name || !email || !password || password.length < 8) {
    return NextResponse.json({ error: "Invalid signup details" }, { status: 400 });
  }
  const normalized = email.toLowerCase();
  const existing = await db().prepare("SELECT id FROM users WHERE email = ?").bind(normalized).first();
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const id = crypto.randomUUID();
  await db()
    .prepare("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)")
    .bind(id, normalized, name, await hashPassword(password))
    .run();
  await createSession(id);
  return NextResponse.json({ id, name, email: normalized }, { status: 201 });
}
