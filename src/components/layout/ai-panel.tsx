"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useOverview } from "@/hooks/use-overview";

/** The persistent Campaign Brain sidebar — recommendations computed server-side from real campaign state. */
export function AiPanel() {
  const { data } = useOverview();
  const pathname = usePathname();
  // Campaign Brain is the AI surface — a second panel beside it is noise.
  if (pathname.startsWith("/brain")) return null;
  if (!data?.film) return null;
  const { ai, film } = data;

  return (
    <aside className="hidden w-80 shrink-0 border-l border-border px-6 py-8 xl:block">
      <div className="flex items-center gap-2 text-[13px] font-medium text-muted">
        <Sparkles className="h-4 w-4" strokeWidth={1.5} />
        Campaign Brain
      </div>

      <section className="mt-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
          Today&apos;s recommendation
        </p>
        <p className="mt-2 text-sm leading-relaxed">{ai.today}</p>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
          Next action
        </p>
        <p className="mt-2 text-sm leading-relaxed">{ai.nextAction}</p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium">
          Do it now <ArrowRight className="h-3.5 w-3.5" />
        </p>
      </section>

      <section className="mt-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
          Campaign summary
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{ai.summary}</p>
        <p className="mt-4 text-xs text-faint">
          {film.title} · {Math.max(film.daysToRelease, 0)} days to release
        </p>
      </section>
    </aside>
  );
}
