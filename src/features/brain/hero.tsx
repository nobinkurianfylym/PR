"use client";

import { useState } from "react";
import { Sparkles, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Recommendation {
  action: string;
  window: string;
  reasons: string[];
  evidence: { label: string; value: string }[];
  unblocks: string;
  alternative: string;
}

/**
 * The one card that answers "what should we do next". It shows the reasoning
 * as reasoning and the facts as facts — no forecast figures, because we have
 * nothing to forecast from.
 */
export function BrainHero({
  rec,
  onExecute,
}: {
  rec: Recommendation;
  onExecute: () => Promise<void>;
}) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <section className="rounded-2xl border border-blue-500/25 bg-surface p-8 md:p-10">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-blue-400">
          <Sparkles className="h-3 w-3" strokeWidth={2} />
          Recommended move
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-faint">
          {rec.window}
        </span>
      </div>

      <h1 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-tight md:text-[2.6rem]">
        {rec.action}
      </h1>

      <div className="mt-7 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            Why now
          </p>
          <ul className="mt-3 space-y-2">
            {rec.reasons.map((r) => (
              <li key={r} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-faint" />
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            <span className="text-faint">What this unblocks — </span>
            {rec.unblocks}
          </p>
        </div>

        <div>
          {/* Facts, not forecasts. Every value here is a real count. */}
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            Campaign facts behind this
          </p>
          <dl className="mt-3 space-y-2.5">
            {rec.evidence.map((e) => (
              <div key={e.label} className="flex items-baseline justify-between gap-4 border-b border-border pb-2.5 last:border-0">
                <dt className="text-sm text-muted">{e.label}</dt>
                <dd className="text-sm font-medium tabular-nums">{e.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          disabled={executing || done}
          onClick={async () => {
            setExecuting(true);
            await onExecute();
            setExecuting(false);
            setDone(true);
          }}
        >
          {done ? (
            <><Check className="h-4 w-4" /> Added to priorities</>
          ) : executing ? "Executing…" : "Execute strategy"}
        </Button>
        <Button variant="ghost" size="lg" onClick={() => setShowReasoning((v) => !v)}>
          View reasoning <ChevronRight className={`h-4 w-4 transition-transform ${showReasoning ? "rotate-90" : ""}`} />
        </Button>
      </div>

      {showReasoning && (
        <div className="mt-6 space-y-4 border-t border-border pt-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
              How this was chosen
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              The Brain walks this campaign&apos;s gaps in the order they block a
              release — key art, then trailer, then amplification, then a booking
              path, then proof, then any open window you have logged. The first
              unmet condition becomes the call. It is a judgement about
              sequencing, made from the facts listed above; it is not a
              prediction, and it carries no forecast of results.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
              Alternative strategy
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {rec.alternative}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
