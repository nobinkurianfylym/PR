import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  Image as ImageIcon, Clapperboard, Archive, Camera, Shapes,
  Download, Ticket, type LucideIcon,
} from "lucide-react";
import { db } from "@/server/db";
import { SubmitForm } from "@/features/press/submit-form";
import { ShareRow } from "@/features/press/share-row";
import { PressCoverage, type CoverageLink } from "@/features/press/press-coverage";
import { linksIn, SHARED_LINK_KINDS, type FilmLink } from "@/lib/platforms";
import { PlatformLogo } from "@/components/ui/platform-logo";
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
    .prepare(
      "SELECT id, title, genre, language, release_date, submissions_open FROM films WHERE slug = ? AND published = 1",
    )
    .bind(slug)
    .first<FilmRow>();
}

async function getLinks(filmId: string): Promise<FilmLink[]> {
  const { results } = await db()
    .prepare("SELECT platform, url FROM film_links WHERE film_id = ?")
    .bind(filmId)
    .all<FilmLink>();
  return results;
}

/** The image a shared link should unfurl with — the poster if there is one. */
async function getShareImage(filmId: string): Promise<string | null> {
  const row = await db()
    .prepare(
      `SELECT id FROM assets
        WHERE film_id = ? AND status = 'approved' AND content_type LIKE 'image/%'
        ORDER BY CASE type WHEN 'Poster' THEN 0 ELSE 1 END, created_at DESC
        LIMIT 1`,
    )
    .bind(filmId)
    .first<{ id: string }>();
  return row?.id ?? null;
}

async function origin(): Promise<string> {
  const host = (await headers()).get("host") ?? "";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

function fmtSize(bytes: number): string {
  return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const film = await getFilm(slug);
  if (!film) return { title: "Press kit — PR.FYLYM" };

  const [imageId, base] = await Promise.all([getShareImage(film.id), origin()]);
  const title = `${film.title} — Press Kit`;
  const description = `Official press materials for ${film.title}: posters, trailer, stills, and EPK. Free to download for press and partners.`;
  const images = imageId ? [`${base}/api/assets/${imageId}`] : undefined;

  return {
    title,
    description,
    // Shared links unfurl as a card with the poster.
    openGraph: {
      title, description, type: "website", url: `${base}/press/${slug}`,
      ...(images && { images }),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title, description,
      ...(images && { images }),
    },
  };
}

export default async function PressKitPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const film = await getFilm(slug);
  if (!film) notFound();

  const [{ results: assets }, links, { results: coverage }] = await Promise.all([
    db()
      .prepare(
        "SELECT id, name, type, content_type, size FROM assets WHERE film_id = ? AND status = 'approved' ORDER BY created_at DESC",
      )
      .bind(film.id)
      .all<AssetRow>(),
    getLinks(film.id),
    db()
      .prepare(
        `SELECT id, url, kind, label FROM shared_links
          WHERE film_id = ? AND status = 'approved'
          ORDER BY created_at DESC, rowid DESC`,
      )
      .bind(film.id)
      .all<CoverageLink>(),
  ]);

  // Group coverage in the catalogue's order, dropping empty kinds.
  const coverageGroups = SHARED_LINK_KINDS.map((kind) => ({
    kind,
    links: coverage.filter((c) => c.kind === kind),
  })).filter((g) => g.links.length > 0);

  const ticketLinks = linksIn(links, "tickets");
  // Everything else rides in one row under the tickets button.
  const pageLinks = linksIn(links, "official", "social", "music");
  const caption = `${film.title} — official press kit.${
    film.release_date ? ` In cinemas ${fmtDate(film.release_date)}.` : ""
  }`;

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

        {ticketLinks.length > 0 && (
          <div className="mt-7 flex flex-wrap gap-2">
            {ticketLinks.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                <Ticket className="h-4 w-4" strokeWidth={1.5} />
                Book tickets{ticketLinks.length > 1 ? ` · ${l.label}` : ""}
              </a>
            ))}
          </div>
        )}

        {pageLinks.length > 0 && (
          <nav
            aria-label="Official pages"
            className={`flex flex-wrap gap-x-2 gap-y-2 ${ticketLinks.length > 0 ? "mt-4" : "mt-7"}`}
          >
            {pageLinks.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener"
                title={l.label}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px] text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                <PlatformLogo platform={l.id} />
                {l.label}
              </a>
            ))}
          </nav>
        )}
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

      {coverageGroups.length > 0 && (
        <PressCoverage film={film.title} groups={coverageGroups} />
      )}

      <ShareRow title={film.title} caption={caption} />

      {film.submissions_open === 1 && <SubmitForm slug={slug} />}

      <footer className="mt-20 border-t border-border pt-6 text-xs text-faint">
        Press kit powered by PR.FYLYM
      </footer>
    </div>
  );
}
