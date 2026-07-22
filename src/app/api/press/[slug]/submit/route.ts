import { NextResponse } from "next/server";
import { db, bucket } from "@/server/db";
import type { AssetType } from "@/types";

/**
 * Anonymous material submissions from a public press kit. Anyone can send a
 * file, but nothing they send is ever served publicly: submissions land as
 * `pending` and only appear on the press kit once the producer approves them.
 * Guarded by a size cap, a type allowlist, and a per-campaign queue limit so
 * an open kit can't be used as free storage or a malware drop.
 */
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_PENDING = 60;
const ALLOWED_PREFIXES = ["image/", "video/", "audio/"];
const ALLOWED_EXACT = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
];

const VALID_TYPES: AssetType[] = ["Poster", "Trailer", "EPK", "Stills", "Logo"];

function isAllowed(contentType: string): boolean {
  return (
    ALLOWED_PREFIXES.some((p) => contentType.startsWith(p)) ||
    ALLOWED_EXACT.includes(contentType)
  );
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const database = db();

  const film = await database
    .prepare("SELECT id, submissions_open FROM films WHERE slug = ? AND published = 1")
    .bind(slug)
    .first<{ id: string; submissions_open: number }>();
  if (!film) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (film.submissions_open !== 1) {
    return NextResponse.json(
      { error: "This press kit is not accepting submissions." },
      { status: 403 },
    );
  }

  const pending = await database
    .prepare("SELECT COUNT(*) AS n FROM assets WHERE film_id = ? AND status = 'pending'")
    .bind(film.id)
    .first<{ n: number }>();
  if ((pending?.n ?? 0) >= MAX_PENDING) {
    return NextResponse.json(
      { error: "The submission queue is full. Please try again later." },
      { status: 429 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const submittedBy = String(form.get("submittedBy") ?? "").slice(0, 120);
  const requested = String(form.get("type") ?? "Stills") as AssetType;
  const type = VALID_TYPES.includes(requested) ? requested : "Stills";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file to send." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Files must be 25MB or smaller." }, { status: 413 });
  }
  const contentType = file.type || "application/octet-stream";
  if (!isAllowed(contentType)) {
    return NextResponse.json(
      { error: "Images, video, audio, PDF, and ZIP files only." },
      { status: 415 },
    );
  }

  const id = crypto.randomUUID();
  const key = `${film.id}/${id}/${file.name}`;
  await bucket().put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType },
  });
  await database
    .prepare(
      `INSERT INTO assets (id, film_id, name, type, content_type, size, r2_key, share_token, status, submitted_by)
       VALUES (?,?,?,?,?,?,?,?,'pending',?)`,
    )
    .bind(
      id, film.id, file.name, type, contentType, file.size, key,
      crypto.randomUUID().replace(/-/g, ""), submittedBy,
    )
    .run();

  return NextResponse.json({ ok: true }, { status: 201 });
}
