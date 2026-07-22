import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Image as ImageIcon, Clapperboard, Archive, Camera, Shapes,
  Download, type LucideIcon,
} from "lucide-react";
import { db } from "@/server/db";
import { SubmitForm } from "@/features/press/submit-form";
import type { AssetType } from "@/types";

/** Reads D1 per request — press kits must reflect the vault immediately. */
export const dynamic = "force-dynamic";

interface FilmRow {
  id: string;
  title: string;
  genre: string;
  language: string;
  release_date: string;
  submissions_open: number;
}

interface AssetRow {
  id: string;
  name: string;
  type: AssetType;
  content_type: string;
  size: number;
}

const TYPE_ICON: Record<AssetType, LucideIcon> = {
  Poster: ImageIcon, Trailer: Clapperboard, EPK: Archive, Stills: Camera, Logo: Shapes,
};

async function getFilm(slug: string): Promise<FilmRow | null> {
  return db()
    .prepare("SELECT id, title, genre, language, release_date, submissions_open FROM films WHERE slug = ? AND published = 1")
    .bind(slug)
    .first<FilmRow>();
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const film = await getFilm(slug);
  if (!film) return { title: "Press kit — PR.FYLYM" };
  return {
    title: `${film.title} — Press Kit`,
    description: `Official press materials for ${film.title}: posters, trailer, stills, and EPK. Free to download for press and partners.`,
  };
}

function fmtSize(bytes: number): string {
  return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function PressKitPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const film = await getFilm(slug);
  if (!film) notFound();

  const { results: assets } = await db()
    .prepare("SELECT id, name, type, content_type, size FROM assets WHERE film_id = ? AND status = 'approved' ORDER BY created_at DESC")
    .bind(film.id)
    .all<AssetRow>();

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 py-16 md:px-10">
      <header className="border-b border-border pb-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-faint">
          Press Kit
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">
          {film.title}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {[film.genre, film.language].filter(Boolean).join(" · ")}
          {film.release_date && ` · In cinemas ${fmtDate(film.release_date)}`}
        </p>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-faint">
          Official materials for press and partners. Everything here is cleared
          for publication — download and use freely.
        </p>
      </header>

      {assets.length === 0 ? (
        <p className="py-20 text-center text-sm text-faint">
          Materials are being prepared. Please check back shortly.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => {
            const Icon = TYPE_ICON[a.type] ?? Camera;
            return (
              <article
                key={a.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-foreground/25"
              >
                {/* Whole image, never cropped — it grows on hover without
                    disturbing the grid. */}
                <div className="flex h-64 items-center justify-center overflow-hidden bg-raised p-3">
                  {a.content_type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/assets/${a.id}`}
                      alt={a.name}
                      loading="lazy"
                      className="max-h-full max-w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.12]"
                    />
                  ) : (
                    <Icon className="h-8 w-8 text-faint" strokeWidth={1.25} />
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="min-w-0 truncate text-xs text-faint" title={a.name}>
                    {a.name} · {fmtSize(a.size)}
                  </p>
                  <a
                    href={`/api/assets/${a.id}?download`}
                    aria-label={`Download ${a.name}`}
                    className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Download
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {film.submissions_open === 1 && <SubmitForm slug={slug} />}

      <footer className="mt-20 border-t border-border pt-6 text-xs text-faint">
        Press kit powered by PR.FYLYM
      </footer>
    </div>
  );
}
