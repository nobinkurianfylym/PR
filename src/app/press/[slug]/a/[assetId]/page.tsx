import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { db } from "@/server/db";
import type { AssetType } from "@/types";

/**
 * A single asset's own page. It exists so that sharing a poster or still
 * produces a proper unfurled card — a raw file URL gives social platforms
 * nothing to preview — and so every share lands the reader somewhere that
 * leads back into the full press kit.
 */
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  name: string;
  type: AssetType;
  content_type: string;
  size: number;
  film_title: string;
  release_date: string;
  slug: string;
}

async function getAsset(slug: string, assetId: string): Promise<Row | null> {
  return db()
    .prepare(
      `SELECT a.id, a.name, a.type, a.content_type, a.size,
              f.title AS film_title, f.release_date, f.slug
         FROM assets a JOIN films f ON f.id = a.film_id
        WHERE f.slug = ? AND a.id = ? AND f.published = 1 AND a.status = 'approved'`,
    )
    .bind(slug, assetId)
    .first<Row>();
}

async function origin(): Promise<string> {
  const host = (await headers()).get("host") ?? "";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

function fmtSize(bytes: number): string {
  return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; assetId: string }> },
): Promise<Metadata> {
  const { slug, assetId } = await params;
  const a = await getAsset(slug, assetId);
  if (!a) return { title: "Press kit — PR.FYLYM" };

  const base = await origin();
  const title = `${a.film_title} — ${a.type}`;
  const description = `Official ${a.type.toLowerCase()} from the ${a.film_title} press kit. Free to download for press and partners.`;
  const images = a.content_type.startsWith("image/") ? [`${base}/api/assets/${a.id}`] : undefined;

  return {
    title,
    description,
    openGraph: {
      title, description, type: "article", url: `${base}/press/${slug}/a/${a.id}`,
      ...(images && { images }),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title, description,
      ...(images && { images }),
    },
  };
}

export default async function AssetPage(
  { params }: { params: Promise<{ slug: string; assetId: string }> },
) {
  const { slug, assetId } = await params;
  const a = await getAsset(slug, assetId);
  if (!a) notFound();

  const isImage = a.content_type.startsWith("image/");

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-16 md:px-10">
      <Link
        href={`/press/${slug}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        {a.film_title} press kit
      </Link>

      <div className="mt-8 flex items-center justify-center overflow-hidden rounded-2xl border border-border bg-raised p-4">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/assets/${a.id}`} alt={a.name} className="max-h-[70vh] max-w-full object-contain" />
        ) : (
          <p className="py-24 text-sm text-faint">{a.type} · {fmtSize(a.size)}</p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">
            {a.type}
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
            {a.film_title}
          </h1>
          <p className="mt-1 text-[13px] text-faint">{a.name} · {fmtSize(a.size)}</p>
        </div>
        <a
          href={`/api/assets/${a.id}?download`}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          <Download className="h-4 w-4" strokeWidth={1.5} /> Download
        </a>
      </div>

      <p className="mt-10 border-t border-border pt-6 text-xs text-faint">
        Press kit powered by PR.FYLYM
      </p>
    </div>
  );
}
