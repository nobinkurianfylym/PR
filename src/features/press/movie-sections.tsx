import { Clapperboard, HelpCircle, Info, Users2 } from "lucide-react";
import type { CastMember, CrewMember } from "@/lib/movie-people";

/**
 * On-page, server-rendered movie sections built only from real data. They are
 * plain HTML (no client JS) so every fact is in the crawled DOM and quotable by
 * search engines and LLMs. Each carries a stable id used by the page nav and by
 * the schema.org SpeakableSpecification.
 */

const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.26em] text-gold-deep";

function Heading({ id, icon: Icon, kicker, title, count }: {
  id: string; icon: typeof Info; kicker: string; title: string; count?: number;
}) {
  return (
    <div id={id} className="flex items-baseline justify-between gap-4 border-b border-border/70 pb-4">
      <div>
        <p className={`flex items-center gap-2 ${eyebrow}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={1.5} /> {kicker}
        </p>
        <h2 className="mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
      </div>
      {count !== undefined && <span className="shrink-0 text-sm tabular-nums text-faint">{count}</span>}
    </div>
  );
}

export function QuickFacts({ title, facts }: { title: string; facts: { label: string; value: string }[] }) {
  if (facts.length === 0) return null;
  return (
    <section id="movie-quick-facts" className="scroll-mt-28">
      <Heading id="quick-facts-h" icon={Info} kicker="Quick Facts" title={`${title} — at a glance`} />
      <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {facts.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
            <dt className="text-[13px] font-medium uppercase tracking-wide text-faint">{f.label}</dt>
            <dd className="text-right text-sm font-medium text-foreground">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function MovieAbout({
  title, tagline, synopsis, factualLine,
}: { title: string; tagline: string; synopsis: string; factualLine: string }) {
  const paras = synopsis.trim() ? synopsis.trim().split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean) : [];
  return (
    <section id="about" className="scroll-mt-28">
      <Heading id="about-h" icon={Clapperboard} kicker="About" title={`About ${title}`} />
      <div className="mt-6 max-w-2xl">
        {tagline && <p className="text-lg font-medium leading-snug text-foreground">{tagline}</p>}
        {paras.length > 0 ? (
          <div className={tagline ? "mt-4 space-y-4" : "space-y-4"}>
            {paras.map((p, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-muted">{p}</p>
            ))}
          </div>
        ) : (
          <p className={`${tagline ? "mt-4 " : ""}text-[15px] leading-relaxed text-muted`}>{factualLine}</p>
        )}
      </div>
    </section>
  );
}

export function CastCrew({ cast, crew }: { cast: CastMember[]; crew: CrewMember[] }) {
  if (cast.length === 0 && crew.length === 0) return null;
  return (
    <section id="cast" className="scroll-mt-28">
      <Heading id="cast-h" icon={Users2} kicker="Cast & Crew" title="Cast & crew" count={cast.length + crew.length} />

      {cast.length > 0 && (
        <>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">Cast</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cast.map((c, i) => (
              <li key={i} className="rounded-2xl border border-border/80 bg-surface/70 px-4 py-3 shadow-soft">
                <p className="text-sm font-semibold text-foreground">{c.name}</p>
                {c.character && <p className="mt-0.5 text-[13px] text-muted">as {c.character}</p>}
              </li>
            ))}
          </ul>
        </>
      )}

      {crew.length > 0 && (
        <>
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">Crew</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {crew.map((c, i) => (
              <li key={i} className="rounded-2xl border border-border/80 bg-surface/70 px-4 py-3 shadow-soft">
                {c.role && <p className="text-[11px] font-medium uppercase tracking-wide text-gold-deep">{c.role}</p>}
                <p className="mt-0.5 text-sm font-semibold text-foreground">{c.name}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function MovieFaq({ faqs }: { faqs: { q: string; a: string }[] }) {
  if (faqs.length === 0) return null;
  return (
    <section id="movie-faq" className="scroll-mt-28">
      <Heading id="faq-h" icon={HelpCircle} kicker="FAQ" title="Frequently asked questions" count={faqs.length} />
      <div className="mt-6 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-surface/60">
        {faqs.map((f, i) => (
          <details key={i} className="group px-5 [&_summary]:list-none">
            <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-[15px] font-medium text-foreground">
              {f.q}
              <span className="shrink-0 text-faint transition-transform duration-300 group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="pb-4 text-[15px] leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
