import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Ticket } from "lucide-react";
import { db } from "@/server/db";
import type { PressAsset } from "@/features/press/asset-card";
import { Reveal } from "@/components/ui/reveal";
import { FanGallery } from "@/features/press/fan-gallery";
import { SubmitForm } from "@/features/press/submit-form";
import { ShareMenu } from "@/features/press/share-menu";
import { PressCoverage, type CoverageLink } from "@/features/press/press-coverage";
import { FanReviews } from "@/features/press/fan-reviews";
import { AudienceReviews } from "@/features/press/audience-reviews";
import { FanJoinBar } from "@/features/press/fan-join-bar";
import { FanClub } from "@/features/press/fan-club";
import { ReferralCapture } from "@/features/press/referral-capture";
import { subdomainFor } from "@/lib/slug";
import { linksIn, SHARED_LINK_KINDS, type FilmLink } from "@/lib/platforms";
import { PlatformLogo } from "@/components/ui/platform-logo";
import type { Review } from "@/types";

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
  // The film's subdomain is the canonical home, whichever host served this.
  const canonical = `https://${subdomainFor(slug)}`;

  return {
    title,
    description,
    metadataBase: new URL(canonical),
    alternates: { canonical },
    openGraph: {
      title, description, type: "website", url: canonical, siteName: "PR.FYLYM",
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

  const [{ results: assets }, links, { results: coverage }, { results: reviews }, heroId, base] = await Promise.all([
    db()
      .prepare(
        "SELECT id, name, type, content_type, size FROM assets WHERE film_id = ? AND status = 'approved' ORDER BY created_at DESC",
      )
      .bind(film.id)
      .all<PressAsset>(),
    getLinks(film.id),
    db()
      .prepare(
        `SELECT id, url, kind, label, image, note FROM shared_links
          WHERE film_id = ? AND status = 'approved'
          ORDER BY created_at DESC, rowid DESC`,
      )
      .bind(film.id)
      .all<CoverageLink>(),
    db()
      .prepare(
        `SELECT id, quote, publication, critic, rating, date FROM reviews
          WHERE film_id = ? ORDER BY date DESC, rowid DESC`,
      )
      .bind(film.id)
      .all<Review>(),
    getHeroImage(film.id),
    origin(),
  ]);

  const coverageGroups = SHARED_LINK_KINDS.map((kind) => ({
    kind,
    links: coverage.filter((c) => c.kind === kind),
  })).filter((g) => g.links.length > 0);

  const { results: rewards } = await db()
    .prepare("SELECT title, detail FROM fan_rewards WHERE film_id = ? ORDER BY sort, created_at")
    .bind(film.id)
    .all<{ title: string; detail: string }>();

  // The gallery shows everything visual (posters, stills, BTS, trailers);
  // non-visual files (EPK, audio) get a plain download list.
  const mediaAssets = assets.filter(
    (a) => a.content_type.startsWith("image/") || a.content_type.startsWith("video/"),
  );
  const fileAssets = assets.filter((a) => !mediaAssets.includes(a));
  // The uploaded title logo (most recent approved Logo image), if any — used to
  // brand the review cards.
  const logoAsset = assets.find((a) => a.type === "Logo" && a.content_type.startsWith("image/"));
  const logoSrc = logoAsset ? `/api/assets/${logoAsset.id}` : null;
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

  const meta = [film.genre, film.language].filter(Boolean).join(" · ");

  // Top-nav anchors — only the sections that exist.
  const nav = [
    { id: "top", label: "Home" },
    ...(mediaAssets.length > 0 ? [{ id: "gallery", label: "Gallery" }] : []),
    {
      id: coverageGroups.length > 0 ? "reviews" : reviews.length > 0 ? "review-wall" : "audience-reviews",
      label: "Reviews",
    },
    ...(musicLinks.length > 0 ? [{ id: "music-links", label: "Music" }] : []),
    { id: "fan-club", label: "Fan Club" },
    { id: "fan-wall", label: "Updates" },
  ];

  const chip =
    "inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/70 px-4 py-2 text-[13px] font-medium text-muted shadow-soft transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-gold/40 hover:text-gold-deep hover:shadow-card";
  const btnDark =
    "inline-flex items-center justify-center gap-2 rounded-full bg-espresso px-6 py-3 text-sm font-semibold text-[#efe7d6] shadow-card transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:opacity-95 hover:shadow-elevated";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: film.title,
    url: `https://${subdomainFor(slug)}`,
    ...(film.genre && { genre: film.genre }),
    ...(film.language && { inLanguage: film.language }),
    ...(film.release_date && { datePublished: film.release_date }),
    ...(heroSrc && { image: `${base}${heroSrc}` }),
  };

  return (
    <div className="theme-fan min-h-screen scroll-smooth bg-background text-foreground" id="top">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Without JS, reveal-on-scroll blocks must still be visible. */}
      <noscript>
        <style>{`.reveal{opacity:1 !important;transform:none !important}`}</style>
      </noscript>
      {/* Top brand nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5 md:px-10">
          <a href="#top" className="group flex min-w-0 items-center gap-3">
            {heroSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroSrc} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-gold/30 transition-transform duration-300 ease-out-expo group-hover:scale-105" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-base font-bold text-gold-deep">
                {film.title.charAt(0)}
              </span>
            )}
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold tracking-tight">{film.title}</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-gold-deep">
                Official Fan Club
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-0.5 lg:flex">
            {nav.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className="rounded-full px-3.5 py-2 text-[13px] font-medium text-muted transition-colors duration-200 hover:bg-raised/70 hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
          </nav>

          {film.submissions_open === 1 ? (
            <SubmitForm
              slug={slug}
              triggerClassName="inline-flex shrink-0 items-center gap-2 rounded-full bg-espresso px-5 py-2.5 text-[13px] font-semibold text-[#efe7d6] shadow-soft transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:opacity-95 hover:shadow-card"
            />
          ) : (
            <a
              href="#join"
              className="shrink-0 rounded-full bg-gold px-5 py-2.5 text-[13px] font-semibold text-white shadow-soft transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:bg-gold-soft hover:shadow-card"
            >
              Join Fan Club
            </a>
          )}
        </div>
      </header>

      <ReferralCapture slug={slug} />

      <main className="relative mx-auto max-w-6xl px-6 md:px-10">
        {/* Soft cinematic glow behind the hero */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden">
          <div className="absolute left-1/2 top-[-200px] h-[560px] w-[920px] max-w-[130vw] -translate-x-1/2 rounded-[50%] bg-gold/12 blur-3xl" />
        </div>

        {/* Hero */}
        <section className="grid items-center gap-12 py-16 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:py-28">
          <div className="rise-in">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gold-deep">
              Official Fan Club
            </p>
            <h1 className="mt-5 text-balance break-words text-5xl font-extrabold uppercase leading-[0.9] tracking-[-0.02em] sm:text-6xl md:text-7xl">
              {film.title}
            </h1>
            <div className="mt-7 h-1 w-16 rounded-full bg-gold" />
            <p className="mt-7 max-w-md text-lg leading-relaxed text-muted md:text-xl">
              Not just a movie — it&rsquo;s our world. Celebrate the madness, be part of the magic.
            </p>
            {meta && (
              <p className="mt-5 text-sm text-faint">
                {meta}
                {film.release_date && ` · In cinemas ${fmtDate(film.release_date)}`}
              </p>
            )}

            <div id="join" className="mt-9 flex scroll-mt-28 flex-wrap items-center gap-3">
              <FanJoinBar slug={slug} film={film.title} />
              {ticketLinks.slice(0, 1).map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener" className={btnDark}>
                  <Ticket className="h-4 w-4" strokeWidth={1.5} /> Book tickets
                </a>
              ))}
              <ShareMenu slug={slug} caption={caption} />
            </div>
          </div>

          {/* Hero image + scan-to-join card */}
          <div className="rise-in relative [animation-delay:120ms]">
            {heroSrc ? (
              <div className="group relative overflow-hidden rounded-3xl shadow-cinematic ring-1 ring-black/[0.06]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroSrc}
                  alt={film.title}
                  className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03] md:aspect-[3/4]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
              </div>
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center rounded-3xl border border-border bg-raised text-6xl font-black text-gold/40 shadow-cinematic">
                {film.title.charAt(0)}
              </div>
            )}
          </div>
        </section>

        {/* Official links — kept on the landing for easy access */}
        {(officialLinks.length > 0 || socialLinks.length > 0 || ticketLinks.length > 0 || communityLinks.length > 0) && (
          <Reveal>
            <section className="border-t border-border/70 py-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-gold-deep">Official links</p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {ticketLinks.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener"
                    className="inline-flex items-center gap-2 rounded-full bg-espresso px-4 py-2 text-[13px] font-semibold text-[#efe7d6] shadow-soft transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:opacity-95 hover:shadow-card">
                    <Ticket className="h-4 w-4" strokeWidth={1.5} /> Book tickets{ticketLinks.length > 1 ? ` · ${l.label}` : ""}
                  </a>
                ))}
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener"
                    className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-[13px] font-semibold text-white shadow-soft transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:opacity-95 hover:shadow-card">
                    <PlatformLogo platform="whatsapp" className="h-4 w-4" /> WhatsApp
                  </a>
                )}
                {telegramUrl && (
                  <a href={telegramUrl} target="_blank" rel="noopener"
                    className="inline-flex items-center gap-2 rounded-full bg-[#229ED9] px-4 py-2 text-[13px] font-semibold text-white shadow-soft transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:opacity-95 hover:shadow-card">
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
          </Reveal>
        )}

        {/* Gallery */}
        {mediaAssets.length > 0 ? (
          <Reveal className="mt-20 md:mt-28">
            <FanGallery slug={slug} filmTitle={film.title} assets={mediaAssets} />
          </Reveal>
        ) : assets.length === 0 ? (
          <div className="mt-16 rounded-3xl border border-dashed border-border/80 bg-surface/50 py-24 text-center">
            <p className="text-sm text-faint">Materials are being prepared. Please check back shortly.</p>
          </div>
        ) : null}

        {fileAssets.length > 0 && (
          <Reveal className="mt-20 md:mt-28">
            <section id="files" className="scroll-mt-28">
              <div className="flex items-baseline justify-between gap-4 border-b border-border/70 pb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-gold-deep">Downloads</p>
                  <h2 className="mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl">Press kit files</h2>
                </div>
                <span className="text-sm tabular-nums text-faint">{fileAssets.length}</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {fileAssets.map((a) => (
                  <a key={a.id} href={`/api/assets/${a.id}?download`} className={chip}>
                    <span className="text-gold-deep">{a.type}</span> · {a.name}
                  </a>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {coverage.length > 0 && (
          <Reveal className="mt-20 md:mt-28">
            <PressCoverage slug={slug} film={film.title} links={coverage} />
          </Reveal>
        )}

        {reviews.length > 0 && (
          <Reveal className="mt-6">
            <FanReviews slug={slug} film={film.title} reviews={reviews} logoSrc={logoSrc} />
          </Reveal>
        )}

        <Reveal className="mt-6">
          <AudienceReviews slug={slug} film={film.title} logoSrc={logoSrc} />
        </Reveal>

        {musicLinks.length > 0 && (
          <Reveal className="mt-20 md:mt-28">
            <section id="music-links" className="scroll-mt-28">
              <div className="flex items-baseline justify-between gap-4 border-b border-border/70 pb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-gold-deep">Listen</p>
                  <h2 className="mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl">Music</h2>
                </div>
                <span className="text-sm tabular-nums text-faint">{musicLinks.length}</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {musicLinks.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener"
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-soft transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:border-gold/40 hover:shadow-card"
                  >
                    <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-raised to-background">
                      {l.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105" />
                      ) : (
                        <PlatformLogo platform={l.id} className="h-14 w-14 text-faint/70" />
                      )}
                      <span className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-md bg-black/55 backdrop-blur-sm">
                        <PlatformLogo platform={l.id} className="h-3.5 w-3.5 text-white" />
                      </span>
                    </div>
                    <span className="px-3.5 py-3 text-[13px] font-medium text-muted transition-colors group-hover:text-foreground">
                      {l.label}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* The Fan Club — the core: join, prizes, leaderboard and wall as one block */}
        <Reveal>
          <FanClub
            slug={slug}
            film={film.title}
            rewards={rewards}
            whatsapp={whatsappUrl}
            telegram={telegramUrl}
          />
        </Reveal>

        {/* Footer */}
        <footer className="mt-24 flex flex-col gap-6 border-t border-border/70 py-12 md:mt-32 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-tight">{film.title}</p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-deep">Official Fan Club</p>
            <p className="mt-3 text-xs leading-relaxed text-faint">
              Build your movie&rsquo;s fan universe.{" "}
              <a href="https://pr.fylym.com/" target="_blank" rel="noopener" className="text-gold-deep underline-offset-2 transition-colors hover:underline">
                pr.fylym.com
              </a>{" "}
              — powered by{" "}
              <a href="https://www.fylym.com" target="_blank" rel="noopener" className="underline-offset-2 transition-colors hover:text-foreground hover:underline">
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
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border/80 text-muted shadow-soft transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-gold/40 hover:text-gold-deep hover:shadow-card"
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
