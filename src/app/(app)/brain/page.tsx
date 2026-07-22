"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, ArrowRight, Check, Plus, Swords, Target, Trash2, Wallet, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrainHero, type Recommendation } from "@/features/brain/hero";
import { Empty, Panel, ReadinessDial } from "@/features/brain/panels";
import { cn } from "@/lib/utils";
import { formatDate } from "@/hooks/use-overview";

interface Brain {
  film: { id: string; title: string; phase: string; daysToRelease: number; releaseDate: string } | null;
  readiness: { met: number; total: number; percent: number };
  fundamentals: { label: string; fact: string; met: boolean }[];
  recommendation: Recommendation;
  priorities: { id: string; title: string; impact: string; due: string }[];
  phases: { phase: string; date: string; summary: string; status: string }[];
  risks: { title: string; severity: "High" | "Medium" | "Low"; evidence: string; action: string }[];
  budget: { amount: number; from: string; to: string; rationale: string } | null;
  feed: string[];
  competitors: { id: string; title: string; event: string; event_date: string }[];
  opportunities: { id: string; title: string; kind: string; window_ends: string; reach: number; done: number }[];
}

const SEVERITY: Record<string, string> = {
  High: "border-red-500/30 text-red-400",
  Medium: "border-amber-500/30 text-amber-400",
  Low: "border-border text-muted",
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function CampaignBrainPage() {
  const [b, setB] = useState<Brain | null>(null);
  const [addingCompetitor, setAddingCompetitor] = useState(false);
  const [addingOpportunity, setAddingOpportunity] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/brain", { cache: "no-store" });
    if (res.ok) setB((await res.json()) as Brain);
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (!b?.film) return null;
  const { film } = b;

  /** Executing the call turns it into a real, tracked priority. */
  async function execute() {
    await fetch("/api/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: b!.recommendation.action,
        detail: b!.recommendation.reasons[0] ?? "",
        impact: "High",
        due: b!.recommendation.window,
      }),
    });
    await load();
  }

  async function post(url: string, body: unknown) {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">
            Campaign Brain
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{film.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {film.phase} phase · {Math.max(film.daysToRelease, 0)} days to release ·{" "}
            {formatDate(String(film.releaseDate))}
          </p>
        </div>
      </header>

      <BrainHero rec={b.recommendation} onExecute={execute} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel
            title="Today's priorities"
            hint="The five highest-impact actions open right now."
          >
            {b.priorities.length === 0 ? (
              <Empty>Everything is clear. Execute the recommended move above.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {b.priorities.map((p) => (
                  <li key={p.id} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                        p.impact === "High" ? SEVERITY.High : SEVERITY.Low,
                      )}
                    >
                      {p.impact}
                    </span>
                    <p className="min-w-0 flex-1 text-sm font-medium">{p.title}</p>
                    <span className="shrink-0 text-xs text-faint">{p.due}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Campaign timeline" hint="The publicity arc, phase by phase.">
            <ol className="flex gap-2 overflow-x-auto pb-1">
              {b.phases.map((p) => (
                <li
                  key={p.phase}
                  className={cn(
                    "min-w-[124px] flex-1 rounded-xl border p-3",
                    p.status === "active" && "border-blue-500/40 bg-blue-500/5",
                    p.status === "done" && "border-border opacity-60",
                    p.status === "upcoming" && "border-border",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {p.status === "done" && <Check className="h-3 w-3 text-emerald-400" strokeWidth={2.5} />}
                    {p.status === "active" && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
                    <p className="truncate text-[13px] font-medium">{p.phase}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-faint">{formatDate(p.date)}</p>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel
            title="Risks"
            accent="risk"
            hint="Only what is actionable — each with the move that defuses it."
          >
            {b.risks.length === 0 ? (
              <Empty>No open risks. The campaign is structurally sound.</Empty>
            ) : (
              <ul className="space-y-4">
                {b.risks.map((r) => (
                  <li key={r.title} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", SEVERITY[r.severity])}>
                        {r.severity}
                      </span>
                      <span className="text-xs text-faint">{r.evidence}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium">{r.title}</p>
                    <p className="mt-1.5 flex gap-2 text-[13px] leading-relaxed text-muted">
                      <ArrowRight className="mt-[3px] h-3.5 w-3.5 shrink-0 text-faint" strokeWidth={1.5} />
                      {r.action}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {b.budget && (
            <Panel title="Budget optimizer" accent="ai" hint="One reallocation, sized to your real marketing budget.">
              <div className="rounded-xl border border-border p-5">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Wallet className="h-4 w-4 text-faint" strokeWidth={1.5} />
                  <span className="text-2xl font-semibold tracking-tight">{inr(b.budget.amount)}</span>
                  <span className="text-muted">from</span>
                  <span className="rounded-lg border border-border px-2 py-1 text-[13px]">{b.budget.from}</span>
                  <ArrowRight className="h-4 w-4 text-faint" strokeWidth={1.5} />
                  <span className="rounded-lg border border-emerald-500/30 px-2 py-1 text-[13px] text-emerald-400">
                    {b.budget.to}
                  </span>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-muted">{b.budget.rationale}</p>
                <div className="mt-4 flex items-center gap-4">
                  <Button size="sm" onClick={() => void post("/api/missions", {
                    title: `Move ${inr(b!.budget!.amount)} from ${b!.budget!.from} to ${b!.budget!.to}`,
                    detail: b!.budget!.rationale, impact: "High", due: "This week",
                  })}>
                    Apply
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          <Panel
            title="Competitor intelligence"
            accent="warning"
            hint="What the field is doing, and how to answer it."
            action={
              <Button variant="ghost" size="sm" onClick={() => setAddingCompetitor((v) => !v)}>
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> Add
              </Button>
            }
          >
            {addingCompetitor && (
              <form
                className="mb-4 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[1fr_1.4fr_auto]"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget as HTMLFormElement);
                  await post("/api/competitors", {
                    title: f.get("title"), event: f.get("event"), eventDate: f.get("eventDate"),
                  });
                  setAddingCompetitor(false);
                }}
              >
                <Input name="title" required placeholder="Competing film" aria-label="Competing film" />
                <Input name="event" required placeholder="What they did — e.g. trailer drops" aria-label="Their move" />
                <div className="flex gap-2">
                  <Input name="eventDate" type="date" aria-label="When" className="w-36" />
                  <Button type="submit" size="sm">Add</Button>
                </div>
              </form>
            )}
            {b.competitors.length === 0 ? (
              <Empty>No competitor moves logged. Add one and the Brain will plan around it.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {b.competitors.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <Swords className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-[13px] text-muted">
                        {c.event}
                        {c.event_date && ` · ${formatDate(c.event_date)}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost" size="sm" aria-label={`Remove ${c.title}`}
                      onClick={async () => {
                        await fetch(`/api/competitors/${c.id}`, { method: "DELETE" });
                        await load();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Opportunity engine"
            accent="opportunity"
            hint="Open windows — timed reach costs less than planned reach."
            action={
              <Button variant="ghost" size="sm" onClick={() => setAddingOpportunity((v) => !v)}>
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> Add
              </Button>
            }
          >
            {addingOpportunity && (
              <form
                className="mb-4 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[1.6fr_auto_auto_auto]"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget as HTMLFormElement);
                  await post("/api/opportunities", {
                    title: f.get("title"), kind: f.get("kind"),
                    windowEnds: f.get("windowEnds"), reach: Number(f.get("reach") ?? 0),
                  });
                  setAddingOpportunity(false);
                }}
              >
                <Input name="title" required placeholder="e.g. Onam festival window" aria-label="Opportunity" />
                <select
                  name="kind" aria-label="Kind"
                  className="h-10 rounded-lg border border-border bg-raised px-3 text-sm text-foreground"
                >
                  {["Trend", "Festival", "Audio", "Interview", "Holiday", "Collaboration", "Activation"].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <Input name="reach" type="number" min="0" placeholder="Reach" aria-label="Potential reach" className="w-28" />
                <div className="flex gap-2">
                  <Input name="windowEnds" type="date" aria-label="Window closes" className="w-36" />
                  <Button type="submit" size="sm">Add</Button>
                </div>
              </form>
            )}
            {b.opportunities.length === 0 ? (
              <Empty>Nothing open. Log a trend, festival, or interview request to work it in.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {b.opportunities.map((o) => (
                  <li key={o.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <Target
                      className={cn("mt-0.5 h-4 w-4 shrink-0", o.done ? "text-faint" : "text-emerald-400")}
                      strokeWidth={1.5}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium", o.done && "text-faint line-through")}>
                        {o.title}
                      </p>
                      <p className="text-[13px] text-muted">
                        {o.kind}
                        {o.reach > 0 && ` · ${(o.reach / 1000).toFixed(0)}K potential reach`}
                        {o.window_ends && ` · closes ${formatDate(o.window_ends)}`}
                      </p>
                    </div>
                    {!o.done && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          await fetch(`/api/opportunities/${o.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ done: true }),
                          });
                          await load();
                        }}
                      >
                        Execute
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="sm" aria-label={`Remove ${o.title}`}
                      onClick={async () => {
                        await fetch(`/api/opportunities/${o.id}`, { method: "DELETE" });
                        await load();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Rail: the score, the forecast, and the Brain thinking aloud. */}
        <div className="space-y-6">
          <Panel
            title="Campaign readiness"
            hint="Tracked fundamentals that are actually in place."
          >
            <ReadinessDial readiness={b.readiness} fundamentals={b.fundamentals} />
          </Panel>

          <Panel title="Live optimization" accent="ai" hint="The Brain, thinking continuously.">
            <ul className="space-y-3.5">
              {b.feed.map((f) => (
                <li key={f} className="flex gap-2.5 text-[13px] leading-relaxed text-muted">
                  <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" strokeWidth={1.5} />
                  {f}
                </li>
              ))}
            </ul>
          </Panel>

          <p className="flex gap-2 px-1 text-[11px] leading-relaxed text-faint">
            <AlertTriangle className="mt-px h-3 w-3 shrink-0" strokeWidth={1.5} />
            Every figure here is a count of something in your campaign. The
            Brain does not forecast reach, ROI, or box office — it has no data
            to forecast from, so it does not guess.
          </p>
        </div>
      </div>
    </div>
  );
}
