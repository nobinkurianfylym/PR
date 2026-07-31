import type { CastMember, CrewMember } from "./movie-people";
import { crewByRole, ROLE_KEYWORDS } from "./movie-people";

/**
 * Structured-data + GEO engine for the public movie page. Everything here is
 * assembled strictly from real, producer-entered data — cast/crew fields, the
 * synopsis, real reviews, real links. Nothing is invented: no plot, no box
 * office, no awards, no fabricated Q&A. Truthful, entity-rich, and complete is
 * what earns citations from search engines and LLMs; fabrication gets filtered.
 */

export interface SeoFilm {
  title: string;
  slug: string;
  genre: string;
  language: string;
  release_date: string;
  tagline: string;
  synopsis: string;
  trailer_url: string;
}

export interface SeoReview {
  quote: string;
  publication: string;
  critic: string;
  rating: number;
  date: string;
}

export interface MovieSeoInput {
  film: SeoFilm;
  canonical: string; // https://<subdomain>
  base: string; // request origin serving assets
  posterUrl: string | null; // absolute
  stillUrls: string[]; // absolute
  cast: CastMember[];
  crew: CrewMember[];
  reviews: SeoReview[];
  sameAs: string[]; // official + social absolute URLs
  ticketUrls: string[];
  fanCount: number;
  today: string; // yyyy-mm-dd
  updatedISO: string;
}

const genres = (g: string) =>
  g.split(/[,/]+/).map((s) => s.trim()).filter(Boolean);

const year = (d: string) => (/^\d{4}/.test(d) ? d.slice(0, 4) : "");

function longDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

const released = (film: SeoFilm, today: string) => film.release_date <= today;

/** A truthful one-line description assembled from real facts (used when no
 *  synopsis is written, and as the schema fallback). */
export function factualLine(film: SeoFilm): string {
  const y = year(film.release_date);
  const lang = film.language ? `${film.language}-language ` : "";
  const g = film.genre ? `${genres(film.genre).join(", ").toLowerCase()} ` : "";
  return `${film.title} is a ${y ? y + " " : ""}${lang}${g}film.`.replace(/\s+/g, " ").trim();
}

/** The schema.org description: the real synopsis if written, else the factual line. */
export function movieDescription(film: SeoFilm): string {
  const s = film.synopsis.trim();
  return s || factualLine(film);
}

const nameSlug = (n: string) =>
  n.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "");

/** AI-quotable Quick Facts — only rows with real values. */
export function movieQuickFacts(input: MovieSeoInput): { label: string; value: string }[] {
  const { film, cast, crew, ticketUrls, today, fanCount } = input;
  const facts: { label: string; value: string }[] = [];
  facts.push({ label: "Title", value: film.title });
  if (film.genre) facts.push({ label: "Genre", value: genres(film.genre).join(", ") });
  if (film.language) facts.push({ label: "Language", value: film.language });
  if (film.release_date)
    facts.push({
      label: released(film, today) ? "Released" : "Release date",
      value: longDate(film.release_date),
    });
  facts.push({ label: "Status", value: released(film, today) ? "In cinemas" : "Upcoming" });
  const director = crewByRole(crew, ROLE_KEYWORDS.director).map((c) => c.name);
  if (director.length) facts.push({ label: director.length > 1 ? "Directors" : "Director", value: director.join(", ") });
  const music = crewByRole(crew, ROLE_KEYWORDS.music).map((c) => c.name);
  if (music.length) facts.push({ label: "Music", value: music.join(", ") });
  if (cast.length) facts.push({ label: "Starring", value: cast.slice(0, 5).map((c) => c.name).join(", ") });
  if (ticketUrls.length) facts.push({ label: "Tickets", value: "Book on the official page" });
  if (fanCount > 0) facts.push({ label: "Fan club members", value: String(fanCount) });
  return facts;
}

/** Truthful FAQs derived from real data — only questions we can answer. */
export function movieFaqs(input: MovieSeoInput): { q: string; a: string }[] {
  const { film, cast, crew, ticketUrls, today } = input;
  const t = film.title;
  const out: { q: string; a: string }[] = [];
  const isOut = released(film, today);

  if (film.release_date) {
    out.push({
      q: isOut ? `When was ${t} released?` : `When is ${t} releasing?`,
      a: `${t} ${isOut ? "was released" : "is scheduled to release"} on ${longDate(film.release_date)}${film.language ? `, in ${film.language}` : ""}.`,
    });
  }
  if (film.language)
    out.push({ q: `What language is ${t} in?`, a: `${t} is a ${film.language}-language film.` });
  if (film.genre)
    out.push({ q: `What genre is ${t}?`, a: `${t} is a ${genres(film.genre).join(", ").toLowerCase()} film.` });

  const director = crewByRole(crew, ROLE_KEYWORDS.director).map((c) => c.name);
  if (director.length)
    out.push({ q: `Who directed ${t}?`, a: `${t} is directed by ${director.join(" and ")}.` });

  if (cast.length)
    out.push({
      q: `Who is in the cast of ${t}?`,
      a: `${t} stars ${cast.slice(0, 8).map((c) => c.name).join(", ")}.`,
    });

  const music = crewByRole(crew, ROLE_KEYWORDS.music).map((c) => c.name);
  if (music.length)
    out.push({ q: `Who composed the music for ${t}?`, a: `The music for ${t} is composed by ${music.join(" and ")}.` });

  const writer = crewByRole(crew, ROLE_KEYWORDS.writer).map((c) => c.name);
  if (writer.length)
    out.push({ q: `Who wrote ${t}?`, a: `${t} is written by ${writer.join(" and ")}.` });

  if (film.synopsis.trim())
    out.push({ q: `What is ${t} about?`, a: film.synopsis.trim() });

  if (ticketUrls.length)
    out.push({
      q: `Where can I watch ${t}?`,
      a: `${t} is ${isOut ? "in cinemas" : `releasing in cinemas on ${longDate(film.release_date)}`}. Book tickets from the official links on this page. OTT / streaming details will be listed here once announced.`,
    });
  else
    out.push({
      q: `Is ${t} on OTT / streaming?`,
      a: `Streaming details for ${t} will be listed on this page as soon as they are officially announced.`,
    });

  if (film.trailer_url)
    out.push({ q: `Where can I watch the ${t} trailer?`, a: `The official ${t} trailer is available in the gallery on this page.` });

  out.push({
    q: `How do I join the ${t} fan club?`,
    a: `Join the official ${t} fan club free on this page — you'll get first-look updates, contests, premiere-ticket draws, and can earn points on the fan leaderboard.`,
  });

  return out;
}

/** The complete JSON-LD @graph for the page. */
export function movieJsonLd(input: MovieSeoInput): object {
  const { film, canonical, cast, crew, reviews, sameAs, posterUrl, stillUrls } = input;
  const idMovie = `${canonical}/#movie`;
  const idOrg = "https://pr.fylym.com/#organization";
  const idWebsite = `${canonical}/#website`;
  const idWebpage = `${canonical}/#webpage`;
  const idBreadcrumb = `${canonical}/#breadcrumb`;
  const idPoster = `${canonical}/#poster`;
  const idTrailer = `${canonical}/#trailer`;
  const idFaq = `${canonical}/#faq`;

  const personId = (name: string) => `${canonical}/#person-${nameSlug(name)}`;
  const people = new Map<string, { name: string; jobTitle?: string }>();
  for (const c of cast) if (!people.has(personId(c.name))) people.set(personId(c.name), { name: c.name, jobTitle: "Actor" });
  for (const c of crew) if (!people.has(personId(c.name))) people.set(personId(c.name), { name: c.name, jobTitle: c.role });

  const personNode = (name: string) => ({ "@id": personId(name) });
  const roleRefs = (keys: readonly string[]) => crewByRole(crew, keys as string[]).map((c) => personNode(c.name));

  const images: string[] = [];
  if (posterUrl) images.push(posterUrl);
  images.push(...stillUrls.filter((u) => u !== posterUrl).slice(0, 8));

  const graph: Record<string, unknown>[] = [];

  // Organization (the platform / publisher)
  graph.push({
    "@type": "Organization",
    "@id": idOrg,
    name: "PR.FYLYM",
    url: "https://pr.fylym.com",
    description: "The AI publicity operating system for films — official fan pages, press kits and fan clubs.",
  });

  // WebSite (the film's official fan-club site)
  graph.push({
    "@type": "WebSite",
    "@id": idWebsite,
    url: canonical,
    name: `${film.title} — Official Fan Club`,
    inLanguage: film.language || undefined,
    publisher: { "@id": idOrg },
    about: { "@id": idMovie },
  });

  // BreadcrumbList
  graph.push({
    "@type": "BreadcrumbList",
    "@id": idBreadcrumb,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "PR.FYLYM", item: "https://pr.fylym.com" },
      { "@type": "ListItem", position: 2, name: film.title, item: canonical },
    ],
  });

  // Poster ImageObject
  if (posterUrl) {
    graph.push({
      "@type": "ImageObject",
      "@id": idPoster,
      contentUrl: posterUrl,
      url: posterUrl,
      caption: `${film.title} — official poster`,
      representativeOfPage: true,
      about: { "@id": idMovie },
    });
  }

  // Trailer VideoObject (only when a real trailer URL exists)
  if (film.trailer_url) {
    graph.push({
      "@type": "VideoObject",
      "@id": idTrailer,
      name: `${film.title} — Official Trailer`,
      description: `Official trailer for ${film.title}.`,
      ...(posterUrl && { thumbnailUrl: posterUrl }),
      embedUrl: film.trailer_url,
      contentUrl: film.trailer_url,
      inLanguage: film.language || undefined,
      about: { "@id": idMovie },
    });
  }

  // Person nodes
  for (const [id, p] of people) {
    graph.push({
      "@type": "Person",
      "@id": id,
      name: p.name,
      ...(p.jobTitle && { jobTitle: p.jobTitle }),
    });
  }

  // Reviews + aggregate
  const validRatings = reviews.filter((r) => r.rating > 0);
  const reviewNodes = reviews.map((r, i) => ({
    "@type": "Review",
    "@id": `${canonical}/#review-${i}`,
    reviewBody: r.quote,
    ...(r.date && { datePublished: r.date }),
    author: r.critic
      ? { "@type": "Person", name: r.critic }
      : { "@type": "Organization", name: r.publication || "Press" },
    ...(r.publication && { publisher: { "@type": "Organization", name: r.publication } }),
    ...(r.rating > 0 && {
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 0.5 },
    }),
    itemReviewed: { "@id": idMovie },
  }));
  const aggregate =
    validRatings.length > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: Number(
            (validRatings.reduce((s, r) => s + r.rating, 0) / validRatings.length).toFixed(2),
          ),
          reviewCount: reviews.length,
          ratingCount: validRatings.length,
          bestRating: 5,
          worstRating: 0.5,
        }
      : null;

  // Movie
  const movie: Record<string, unknown> = {
    "@type": "Movie",
    "@id": idMovie,
    name: film.title,
    url: canonical,
    mainEntityOfPage: { "@id": idWebpage },
    description: movieDescription(film),
    ...(film.tagline && { slogan: film.tagline }),
    ...(film.genre && { genre: genres(film.genre) }),
    ...(film.language && { inLanguage: film.language }),
    ...(film.release_date && { datePublished: film.release_date }),
    ...(images.length && { image: images }),
    ...(sameAs.length && { sameAs }),
    ...(film.trailer_url && { trailer: { "@id": idTrailer } }),
  };
  const directors = roleRefs(ROLE_KEYWORDS.director);
  if (directors.length) movie.director = directors;
  const writers = roleRefs(ROLE_KEYWORDS.writer);
  if (writers.length) movie.author = writers;
  const producers = roleRefs(ROLE_KEYWORDS.producer);
  if (producers.length) movie.producer = producers;
  const musicBy = roleRefs(ROLE_KEYWORDS.music);
  if (musicBy.length) movie.musicBy = musicBy;
  if (cast.length)
    movie.actor = cast.map((c) => ({
      "@type": "PerformanceRole",
      ...(c.character && { characterName: c.character }),
      actor: personNode(c.name),
    }));
  if (aggregate) movie.aggregateRating = aggregate;
  if (reviewNodes.length) movie.review = reviewNodes.map((r) => ({ "@id": r["@id"] }));
  graph.push(movie);
  graph.push(...reviewNodes);

  // FAQPage
  const faqs = movieFaqs(input);
  if (faqs.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": idFaq,
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  // WebPage (ties it together, with Speakable for voice/AI)
  graph.push({
    "@type": "WebPage",
    "@id": idWebpage,
    url: canonical,
    name: `${film.title} — Official Fan Club, Cast, Trailer, Reviews & Release Date`,
    description: movieDescription(film),
    inLanguage: film.language || undefined,
    isPartOf: { "@id": idWebsite },
    about: { "@id": idMovie },
    ...(posterUrl && { primaryImageOfPage: { "@id": idPoster } }),
    breadcrumb: { "@id": idBreadcrumb },
    datePublished: film.release_date || undefined,
    dateModified: input.updatedISO,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["#movie-quick-facts", "#about", "#movie-faq"],
    },
  });

  return { "@context": "https://schema.org", "@graph": graph };
}
