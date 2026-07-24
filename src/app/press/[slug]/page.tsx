import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowRight, Quote, Ticket } from "lucide-react";
import { db } from "@/server/db";
import { AssetCard, type PressAsset } from "@/features/press/asset-card";
import { SectionHeading } from "@/components/ui/section-nav";
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

/** The lead image — the poster if there is one, else any still. */
async function getHeroImage(filmId: string): Promise<string | null> {
  const row = await db()
    .prepare(
      `SELECT id FROM assets
        WHERE film_id = ? AND status = 'approved' AND content_type LIKE 'image/%'
        ORDER BY CASE type WHEN 'Poster' THEN 0 WHEN 'Stills' THEN 1 ELSE 2 END, created_at DESC
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
  if (!film) return { title: "Fan club — PR.FYLYM" };

  const [imageId, base] = await Promise.all([getHeroImage(film.id), origin()]);
  const title = `${film.title} — Official Fan Club`;
  const description = `Join the ${film.title} fan club: first-look updates, contests, premiere-ticket draws, posters, trailer and reviews — all in one place.`;
  const images = imageId ? [`${base}/api/assets/${imageId}`] : undefined;

  return {
    title,
    description,
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

export default async function FanPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const film = await getFilm(slug);
  if (!film) notFound();

  const [{ results: assets }, links, { results: coverage }, heroId, base] = await Promise.all([
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
    getHeroImage(film.id),
    origin(),
  ]);

  const coverageGroups = SHARED_LINK_KINDS.map((kind) => ({
    kind,
    links: coverage.filter((c) => c.kind === kind),
  })).filter((g) => g.links.length > 0);

  const assetGroups = groupAssets(assets);
  const musicLinks = linksIn(links, "music");
  const ticketLinks = linksIn(links, "tickets");
  const officialLinks = linksIn(links, "official");
  const socialLinks = linksIn(links, "social");
  const communityLinks = linksIn(links, "community");
  const whatsappUrl = communityLinks.find((l) => l.id === "whatsapp")?.url;
  const telegramUrl = communityLinks.find((l) => l.id === "telegram")?.url;
  const heroSrc = heroId ? `/api/assets/${heroId}` : null;
  const caption = `LOVE ${film.title}? JOIN THE FAN CLUB${
    film.release_date ? ` — in cinemas ${fmtDate(film.release_date)}.` : "."
  }`;

  // A scan-to-join QR of this very page for posters and the cinema lobby.
  let qrSvg: string | null = null;
  try {
    qrSvg = await QRCode.toString(`${base}/press/${slug}`, {
      type: "svg", margin: 0, color: { dark: "#241d13", light: "#00000000" },
    });
  } catch {
    qrSvg = null;
  }

  const meta = [film.genre, film.language].filter(Boolean).join(" · ");

  // Top-nav anchors — only the sections that exist.
  const nav = [
    { id: "top", label: "Home" },
    ...(assetGroups.length > 0 ? [{ id: "gallery", label: "Gallery" }] : []),
    ...(coverageGroups.length > 0 ? [{ id: "reviews", label: "Reviews" }] : []),
    ...(musicLinks.length > 0 ? [{ id: "music-links", label: "Music" }] : []),
    { id: "fan-club", label: "Fan Club" },
    { id: "fan-wall", label: "Updates" },
  ];

  const chip =
    "inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3.5 py-2 text-[13px] font-medium text-muted transition-colors hover:border-gold/50 hover:text-gold-deep";

  return (
    <div className="theme-fan min-h-screen scroll-smooth bg-background text-foreground" id="top">
      {/* Top brand nav */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 md:px-8">
          <a href="#top" className="flex min-w-0 items-center gap-3">
            {heroSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroSrc} alt="" className="h-11 w-11 shrink-0 rounded-full border border-gold/40 object-cover" />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-base font-bold text-gold-deep">
                {film.title.charAt(0)}
              </span>
            )}
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-bold uppercase tracking-wide">{film.title}</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-deep">
                Official Fan Club
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-6 text-[12px] font-semibold uppercase tracking-wide text-muted lg:flex">
            {nav.map((n) => (
              <a key={n.id} href={`#${n.id}`} className="transition-colors hover:text-gold-deep">
                {n.label}
              </a>
            ))}
          </nav>

          <a
            href="#join"
            className="shrink-0 rounded-full bg-gold px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm shadow-gold/30 transition-colors hover:bg-gold-soft"
          >
            Join Fan Club
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 md:px-8">
        {/* Hero */}
        <section className="grid items-center gap-10 py-12 md:grid-cols-2 md:py-16">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold-deep">
              Official Fan Club
            </p>
            <h1 className="mt-4 text-5xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-7xl">
              {film.title}
            </h1>
            <div className="mt-6 h-1 w-16 rounded-full bg-gold" />
            <p className="mt-6 max-w-md text-lg font-medium leading-snug text-muted">
              Not just a movie — it&rsquo;s our world. Celebrate the madness, be part of the magic.
            </p>
            {meta && (
              <p className="mt-4 text-sm text-faint">
                {meta}
                {film.release_date && ` · In cinemas ${fmtDate(film.release_date)}`}
              </p>
            )}

            <div id="join" className="mt-8 flex scroll-mt-24 flex-wrap items-center gap-3">
              <FanJoinBar slug={slug} film={film.title} />
              {ticketLinks.slice(0, 1).map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 rounded-full bg-espresso px-5 py-2.5 text-sm font-semibold text-[#efe7d6] transition-opacity hover:opacity-90"
                >
                  <Ticket className="h-4 w-4" strokeWidth={1.5} /> Book tickets
                </a>
              ))}
              <ShareMenu slug={slug} caption={caption} />
            </div>
          </div>

          {/* Hero image + scan-to-join card */}
          <div className="relative">
            {heroSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroSrc}
                alt={film.title}
                className="aspect-[4/5] w-full rounded-2xl border border-border object-cover shadow-2xl md:aspect-[3/4]"
              />
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center rounded-2xl border border-border bg-raised text-6xl font-black text-gold/40">
                {film.title.charAt(0)}
              </div>
            )}
            {qrSvg && (
              <div className="absolute bottom-4 right-4 flex items-center gap-3 rounded-xl bg-espresso/95 p-3 pr-4 shadow-xl backdrop-blur">
                <div
                  className="h-16 w-16 rounded-md bg-white p-1.5 [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gold-soft">Join the fan club</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#c7bca4]">Scan to join</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Official links — kept on the landing for easy access */}
        {(officialLinks.length > 0 || socialLinks.length > 0 || ticketLinks.length > 0 || communityLinks.length > 0) && (
          <section className="border-t border-border py-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold-deep">Official links</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {ticketLinks.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener"
                  className="inline-flex items-center gap-2 rounded-full bg-espresso px-4 py-2 text-[13px] font-semibold text-[#efe7d6] transition-opacity hover:opacity-90">
                  <Ticket className="h-4 w-4" strokeWidth={1.5} /> Book tickets{ticketLinks.length > 1 ? ` · ${l.label}` : ""}
                </a>
              ))}
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener"
                  className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90">
                  <PlatformLogo platform="whatsapp" className="h-4 w-4" /> WhatsApp
                </a>
              )}
              {telegramUrl && (
                <a href={telegramUrl} target="_blank" rel="noopener"
                  className="inline-flex items-center gap-2 rounded-full bg-[#229ED9] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90">
                  <PlatformLogo platform="telegram" className="h-4 w-4" /> Telegram
                </a>
              )}
              {[...officialLinks, ...socialLinks].map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener" title={l.label} className={chip}>
                  <PlatformLogo platform={l.id} /> {l.label}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Gallery */}
        <div id="gallery" className="scroll-mt-20">
          {assets.length === 0 ? (
            <p className="py-20 text-center text-sm text-faint">
              Materials are being prepared. Please check back shortly.
            </p>
          ) : (
            <div className="space-y-12 pt-6">
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
        </div>

        {coverageGroups.length > 0 && (
          <div id="reviews" className="scroll-mt-20">
            <PressCoverage slug={slug} film={film.title} groups={coverageGroups} />
          </div>
        )}

        {musicLinks.length > 0 && (
          <section id="music-links" className="mt-14 scroll-mt-20">
            <SectionHeading id="music-links-h" title="Music" count={musicLinks.length} />
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {musicLinks.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener"
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-gold/40"
                >
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-raised">
                    {l.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" />
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

        {/* Be part of the story band */}
        <section className="mt-16 overflow-hidden rounded-2xl bg-espresso px-8 py-12 text-center md:py-16">
          <p className="text-[12px] font-bold uppercase tracking-[0.24em] text-gold-soft">Be more than a fan</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold uppercase leading-tight tracking-tight text-[#f3ecdd] md:text-5xl">
            Be part of the story.
          </h2>
          <a
            href="#fan-wall"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-gold-soft"
          >
            Join the conversation <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </a>
        </section>

        {film.submissions_open === 1 && (
          <div className="mt-14">
            <SubmitForm slug={slug} />
          </div>
        )}

        <FanLeaderboard slug={slug} />

        <FanBoard slug={slug} whatsapp={whatsappUrl} telegram={telegramUrl} />

        {/* Quote band */}
        <section className="mt-16 flex items-center justify-center gap-4 border-y border-border py-10 text-center">
          <Quote className="hidden h-6 w-6 shrink-0 rotate-180 text-gold sm:block" fill="currentColor" strokeWidth={0} />
          <p className="text-lg font-semibold uppercase tracking-wide text-muted md:text-xl">
            A crazy world. A fearless heart. A story like no other.
          </p>
          <Quote className="hidden h-6 w-6 shrink-0 text-gold sm:block" fill="currentColor" strokeWidth={0} />
        </section>

        {/* Footer */}
        <footer className="mt-12 flex flex-col gap-6 border-t border-border py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide">{film.title}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-deep">Official Fan Club</p>
            <p className="mt-2 text-xs text-faint">
              Build your movie&rsquo;s fan universe.{" "}
              <a href="https://pr.fylym.com/" target="_blank" rel="noopener" className="text-gold-deep underline-offset-2 hover:underline">
                pr.fylym.com
              </a>{" "}
              — powered by{" "}
              <a href="https://www.fylym.com" target="_blank" rel="noopener" className="underline-offset-2 hover:text-foreground hover:underline">
                fylym.com
              </a>
            </p>
          </div>
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">Follow us</span>
              {socialLinks.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener"
                  title={l.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-gold/50 hover:text-gold-deep"
                >
                  <PlatformLogo platform={l.id} className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </footer>
      </main>
    </div>
  );
}
