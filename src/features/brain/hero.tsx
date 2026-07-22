"use client";

import { useState } from "react";
import { Sparkles, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Recommendation {
  action: string;
  window: string;
  reasons: string[];
  impact: { label: string; value: string }[];
  confidence: number;
  alternative: string;
}

/**
 * The one card that answers "what should we do next". Everything below it on
 * the screen exists to support or challenge this call.
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
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            Projected impact
          </p>
          <dl className="mt-3 space-y-2.5">
            {rec.impact.map((i) => (
              <div key={i.label} className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted">{i.label}</dt>
                <dd className="text-sm font-medium tabular-nums text-emerald-400">{i.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-4">
            <span className="text-[13px] text-muted">Confidence</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-raised">
              <div className="h-full rounded-full bg-blue-400" style={{ width: `${rec.confidence}%` }} />
            </div>
            <span className="text-[13px] font-medium tabular-nums">{rec.confidence}%</span>
          </div>
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
              The Brain walks the campaign&apos;s structural gaps in the order they
              block a release — key art, then trailer, then amplification, then a
              booking path, then proof. The first unmet condition becomes the
              call. Impact figures are projections from that state, not measured
              results, and confidence rises as more of the campaign is real.
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
