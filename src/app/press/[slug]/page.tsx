import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Ticket } from "lucide-react";
import { db } from "@/server/db";
import { AssetCard, type PressAsset } from "@/features/press/asset-card";
import { SectionNav, SectionHeading } from "@/components/ui/section-nav";
import { groupAssets } from "@/lib/asset-sections";
import { SubmitForm } from "@/features/press/submit-form";
import { ShareMenu } from "@/features/press/share-menu";
import { PressCoverage, type CoverageLink } from "@/features/press/press-coverage";
import { FanJoinBar } from "@/features/press/fan-join-bar";
import { FanLeaderboard } from "@/features/press/fan-leaderboard";
import { FanBoard } from "@/features/press/fan-board";
import { linksIn, SHARED_LINK_KINDS, type FilmLink } from "@/lib/platforms";
import { PlatformLogo } from "@/components/ui/platform-logo";

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
    .prepare("SELECT platform, url, image FROM film_links WHERE film_id = ?")
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
      .all<PressAsset>(),
    getLinks(film.id),
    db()
      .prepare(
        `SELECT id, url, kind, label, image FROM shared_links
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

  const assetGroups = groupAssets(assets);
  const musicLinks = linksIn(links, "music");

  // Only sections with something in them get a nav entry.
  const navSections = [
    ...assetGroups.map((g) => ({ id: g.section.id, label: g.section.label })),
    ...(coverageGroups.length > 0 ? [{ id: "reviews", label: "Reviews" }] : []),
    ...(musicLinks.length > 0 ? [{ id: "music-links", label: "Music" }] : []),
    { id: "fan-club", label: "Fan Club" },
    { id: "fan-wall", label: "Discussion" },
  ];

  const ticketLinks = linksIn(links, "tickets");
  // Everything else rides in one row under the tickets button.
  const pageLinks = linksIn(links, "official", "social");
  const communityLinks = linksIn(links, "community");
  const whatsappUrl = communityLinks.find((l) => l.id === "whatsapp")?.url;
  const telegramUrl = communityLinks.find((l) => l.id === "telegram")?.url;
  const caption = `LOVE ${film.title}? JOIN THE FAN CLUB${
    film.release_date ? ` — in cinemas ${fmtDate(film.release_date)}.` : "."
  }`;

  return (
    <div className="theme-light min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 pb-[45vh] pt-16 md:px-10">
      <header className="border-b border-border pb-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-indigo-600">
          Official Fan Page
        </p>
        <div className="mt-3 flex items-start justify-between gap-4">
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            {film.title}
          </h1>
          <div className="mt-1 shrink-0">
            <ShareMenu slug={slug} caption={caption} />
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          {[film.genre, film.language].filter(Boolean).join(" · ")}
          {film.release_date && ` · In cinemas ${fmtDate(film.release_date)}`}
        </p>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-faint">
          Join the fan club for first-look updates, contests and premiere-ticket
          draws — and earn points every time you share a poster, trailer or
          review. Everything below is official and cleared to share.
        </p>

        <div className="mt-7 flex flex-wrap items-start gap-3">
          <div>
            <FanJoinBar slug={slug} film={film.title} />
          </div>
          {film.submissions_open === 1 && <SubmitForm slug={slug} />}
        </div>

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

      <SectionNav sections={navSections} accent />

      {assets.length === 0 ? (
        <p className="py-20 text-center text-sm text-faint">
          Materials are being prepared. Please check back shortly.
        </p>
      ) : (
        <div className="space-y-12">
          {assetGroups.map(({ section, items }) => (
            <section key={section.id}>
              <SectionHeading id={section.id} title={section.label} count={items.length} />
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((a) => (
                  <AssetCard key={a.id} asset={a} slug={slug} filmTitle={film.title} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {coverageGroups.length > 0 && (
        <div id="reviews" className="scroll-mt-24">
          <PressCoverage slug={slug} film={film.title} groups={coverageGroups} />
        </div>
      )}

      {musicLinks.length > 0 && (
        <section id="music-links" className="mt-14 scroll-mt-24">
          <SectionHeading id="music-links-h" title="Music" count={musicLinks.length} />
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {musicLinks.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener"
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-foreground/25"
              >
                <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-raised">
                  {l.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.image}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <PlatformLogo platform={l.id} className="h-8 w-8 text-faint" />
                  )}
                  <span className="absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/55 backdrop-blur-sm">
                    <PlatformLogo platform={l.id} className="h-3.5 w-3.5 text-white" />
                  </span>
                </div>
                <span className="px-3 py-2.5 text-[13px] font-medium text-muted transition-colors group-hover:text-foreground">
                  {l.label}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      <FanLeaderboard slug={slug} />

      <FanBoard slug={slug} whatsapp={whatsappUrl} telegram={telegramUrl} />

      <footer className="mt-20 border-t border-border pt-8 text-sm">
        <p className="font-medium text-foreground">
          Build your movie&rsquo;s fan universe.{" "}
          <a
            href="https://pr.fylym.com/"
            target="_blank"
            rel="noopener"
            className="text-indigo-600 underline-offset-2 hover:underline"
          >
            pr.fylym.com
          </a>
        </p>
        <p className="mt-1.5 text-xs text-faint">
          Powered by{" "}
          <a
            href="https://www.fylym.com"
            target="_blank"
            rel="noopener"
            className="text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            www.fylym.com
          </a>{" "}
          — Where ambitious films begin.
        </p>
      </footer>
      </div>
    </div>
  );
}
