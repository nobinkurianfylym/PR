"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, ArrowRight, CalendarClock, Check, ExternalLink, Loader2, Paperclip,
  Plus, Radar, Swords, Target, Trash2, UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrainHero, type Recommendation } from "@/features/brain/hero";
import { Empty, Panel, ReadinessDial } from "@/features/brain/panels";
import { cn } from "@/lib/utils";
import { formatDate } from "@/hooks/use-overview";

interface Priority {
  id: string; title: string; impact: string; due: string;
  assignee: string | null; dueDate: string | null; overdue: boolean;
  asset: { id: string; type: string; name: string } | null;
}
interface Brain {
  film: { id: string; title: string; phase: string; daysToRelease: number; releaseDate: string; market: string } | null;
  readiness: { met: number; total: number; percent: number };
  fundamentals: { label: string; fact: string; met: boolean }[];
  recommendation: Recommendation;
  reasonedBy: "model" | "rules";
  priorities: Priority[];
  phases: { phase: string; date: string; summary: string; status: string }[];
  risks: { title: string; severity: "High" | "Medium" | "Low"; evidence: string; action: string }[];
  events: { kind: string; text: string; at: string }[];
  team: { id: string; name: string; role: string; status: string }[];
  assets: { id: string; type: string; name: string }[];
  competitors: { id: string; title: string; event: string; event_date: string; url: string }[];
  opportunities: { id: string; title: string; kind: string; window_ends: string; ship: string; done: number }[];
}

const SEVERITY: Record<string, string> = {
  High: "border-red-500/30 text-red-400",
  Medium: "border-amber-500/30 text-amber-400",
  Low: "border-border text-muted",
};
const KINDS = ["Trend", "Festival", "Audio", "Interview", "Holiday", "Collaboration", "Activation"];
const EVENT_DOT: Record<string, string> = { fan: "bg-emerald-400", review: "bg-amber-400", coverage: "bg-blue-400", asset: "bg-violet-400" };

function timeAgo(at: string): string {
  const t = new Date(at).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24); return d === 1 ? "yesterday" : `${d}d ago`;
}

/** Suggest a real deadline from the recommendation's window phrasing. */
function windowToDate(window: string): string {
  const now = new Date();
  const add = (n: number) => new Date(now.getTime() + n * 864e5).toISOString().slice(0, 10);
  const w = window.toLowerCase();
  const explicit = window.match(/\d{4}-\d{2}-\d{2}/);
  if (explicit) return explicit[0];
  if (w.includes("today")) return add(0);
  if (w.includes("48")) return add(2);
  if (w.includes("week")) return add(7);
  return add(1);
}

export default function CampaignBrainPage() {
  const [b, setB] = useState<Brain | null>(null);
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assetId, setAssetId] = useState("");
  const [addingOpp, setAddingOpp] = useState(false);
  const [market, setMarket] = useState("");
  const [scanning, setScanning] = useState(false);
  const [clashMsg, setClashMsg] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<{ url: string; title: string; description: string }[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/brain", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as Brain;
      setB(data);
      if (data.film) {
        setDueDate((prev) => prev || windowToDate(data.recommendation.window));
        setMarket((prev) => prev || data.film!.market);
      }
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (!b?.film) return null;
  const { film } = b;

  async function post(url: string, body: unknown) {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await load();
  }

  /** Execute → a real, owned, dated task carrying the recommendation's context. */
  async function execute() {
    await post("/api/missions", {
      title: b!.recommendation.action,
      detail: b!.recommendation.reasons[0] ?? "",
      impact: "High",
      due: b!.recommendation.window,
      assignee, dueDate, assetId, source: "Brain recommendation",
    });
  }

  async function scanClashes() {
    setScanning(true); setClashMsg(null); setCandidates([]);
    const res = await fetch("/api/clashes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ market }) });
    const d = (await res.json().catch(() => ({}))) as { candidates?: typeof candidates; releaseMonth?: string; error?: string };
    if (res.ok) {
      setCandidates(d.candidates ?? []);
      setClashMsg((d.candidates?.length ?? 0) === 0 ? "No likely clashes found — looks like a clear weekend." : `Found ${d.candidates!.length} films around ${d.releaseMonth}. Confirm any real clash.`);
    } else setClashMsg(d.error ?? "Couldn't scan.");
    setScanning(false);
  }

  const activeTeam = b.team.filter((t) => t.status === "Active");
  const teamOptions = activeTeam.length ? activeTeam : b.team;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">Campaign Brain · Deep planner</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{film.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {film.phase} phase · {Math.max(film.daysToRelease, 0)} days to release · {formatDate(String(film.releaseDate))}
        </p>
      </header>

      <BrainHero rec={b.recommendation} reasonedBy={b.reasonedBy} onExecute={execute} />

      {/* Assign & schedule — the playbook inputs the Execute button commits. */}
      <Panel title="Assign & schedule this move" hint="Give it an owner and a real deadline before Execute puts it on the board.">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-faint"><UserRound className="h-3 w-3" /> Owner</span>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-raised px-3 text-sm text-foreground">
              <option value="">Unassigned</option>
              {teamOptions.map((t) => <option key={t.id} value={t.name}>{t.name}{t.role ? ` · ${t.role}` : ""}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-faint"><CalendarClock className="h-3 w-3" /> Deadline</span>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-faint"><Paperclip className="h-3 w-3" /> Attach asset</span>
            <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-raised px-3 text-sm text-foreground">
              <option value="">None</option>
              {b.assets.map((a) => <option key={a.id} value={a.id}>{a.type} — {a.name}</option>)}
            </select>
          </label>
        </div>
        {b.team.length === 0 && <p className="mt-2 text-[11px] text-faint">Add people in Street Team to assign owners.</p>}
      </Panel>

      {/* Readiness — promoted: the honest, auditable core. */}
      <Panel title="Campaign readiness" hint="The share of tracked fundamentals actually in place — every item shown.">
        <ReadinessDial readiness={b.readiness} fundamentals={b.fundamentals} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Panel title="Today's priorities" hint="Owned, dated tasks — overdue ones flagged.">
            {b.priorities.length === 0 ? (
              <Empty>Everything is clear. Execute the recommended move above.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {b.priorities.map((p) => (
                  <li key={p.id} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                    <span className={cn("mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", p.impact === "High" ? SEVERITY.High : SEVERITY.Low)}>
                      {p.impact}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-faint">
                        {p.assignee && <span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" />{p.assignee}</span>}
                        {p.dueDate ? (
                          <span className={cn(p.overdue && "font-medium text-red-400")}>{p.overdue ? "Overdue · " : "Due "}{formatDate(p.dueDate)}</span>
                        ) : (
                          <span>{p.due}</span>
                        )}
                        {p.asset && <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" />{p.asset.type}</span>}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Campaign timeline" hint="The publicity arc, phase by phase.">
            <ol className="flex gap-2 overflow-x-auto pb-1">
              {b.phases.map((p) => (
                <li key={p.phase} className={cn("min-w-[124px] flex-1 rounded-xl border p-3",
                  p.status === "active" && "border-blue-500/40 bg-blue-500/5",
                  p.status === "done" && "border-border opacity-60",
                  p.status === "upcoming" && "border-border")}>
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

          <Panel title="Risks" accent="risk" hint="Only what is actionable — each with the move that defuses it.">
            {b.risks.length === 0 ? (
              <Empty>No open risks. The campaign is structurally sound.</Empty>
            ) : (
              <ul className="space-y-4">
                {b.risks.map((r) => (
                  <li key={r.title} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", SEVERITY[r.severity])}>{r.severity}</span>
                      <span className="text-xs text-faint">{r.evidence}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium">{r.title}</p>
                    <p className="mt-1.5 flex gap-2 text-[13px] leading-relaxed text-muted">
                      <ArrowRight className="mt-[3px] h-3.5 w-3.5 shrink-0 text-faint" strokeWidth={1.5} />{r.action}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Release-date clash radar */}
          <Panel title="Release-date clashes" accent="warning" hint="The costliest surprise in a release — find films landing on your weekend.">
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[10rem] flex-1">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-faint">Market / region</span>
                <Input value={market} onChange={(e) => setMarket(e.target.value)} placeholder="e.g. Tamil Nadu, Kerala, India" />
              </label>
              <Button size="sm" onClick={() => void scanClashes()} disabled={scanning}>
                {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radar className="h-3.5 w-3.5" strokeWidth={1.5} />}
                {scanning ? "Scanning…" : "Scan for clashes"}
              </Button>
            </div>
            {clashMsg && <p className="mt-2 text-[13px] text-muted">{clashMsg}</p>}

            {candidates.length > 0 && (
              <ul className="mt-3 space-y-2">
                {candidates.map((c) => (
                  <li key={c.url} className="flex items-start gap-2 rounded-xl border border-border p-3">
                    <a href={c.url} target="_blank" rel="noopener" className="min-w-0 flex-1 text-[13px]">
                      <span className="font-medium hover:text-foreground">{c.title || c.url}</span>
                      {c.description && <span className="mt-0.5 line-clamp-2 block text-[12px] text-faint">{c.description}</span>}
                    </a>
                    <Button size="sm" variant="outline" onClick={() => void post("/api/competitors", { title: (c.title || "Competing release").slice(0, 120), event: "Possible release-date clash", eventDate: film.releaseDate, url: c.url })}>
                      <Plus className="h-3.5 w-3.5" /> Log clash
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {b.competitors.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-faint">Logged clashes</p>
                <ul className="mt-2 divide-y divide-border">
                  {b.competitors.map((c) => (
                    <li key={c.id} className="flex items-start gap-3 py-3">
                      <Swords className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" strokeWidth={1.5} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-[13px] text-muted">
                          {c.event}{c.event_date && ` · ${formatDate(c.event_date)}`}
                          {c.url && <> · <a href={c.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-blue-400 hover:underline">source <ExternalLink className="h-3 w-3" /></a></>}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" aria-label={`Remove ${c.title}`} onClick={async () => { await fetch(`/api/competitors/${c.id}`, { method: "DELETE" }); await load(); }}>
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          {/* Opportunity engine — window + what to ship */}
          <Panel title="Opportunity engine" accent="opportunity" hint="Open windows: a date, and the exact thing to ship by then."
            action={<Button variant="ghost" size="sm" onClick={() => setAddingOpp((v) => !v)}><Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> Add</Button>}>
            {addingOpp && (
              <form className="mb-4 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget as HTMLFormElement);
                  await post("/api/opportunities", { title: f.get("title"), kind: f.get("kind"), windowEnds: f.get("windowEnds"), ship: f.get("ship") });
                  setAddingOpp(false);
                }}>
                <Input name="title" required placeholder="Window — e.g. Onam weekend" aria-label="Window" />
                <select name="kind" aria-label="Kind" className="h-10 rounded-lg border border-border bg-raised px-3 text-sm text-foreground">
                  {KINDS.map((k) => <option key={k}>{k}</option>)}
                </select>
                <Input name="ship" required placeholder="Ship — e.g. publish festival poster" aria-label="What to ship" className="sm:col-span-2" />
                <div className="flex gap-2 sm:col-span-2">
                  <Input name="windowEnds" type="date" aria-label="By date" className="min-w-0 flex-1" />
                  <Button type="submit" size="sm">Add</Button>
                </div>
              </form>
            )}
            {b.opportunities.length === 0 ? (
              <Empty>Nothing open. Log a trend, festival, or interview window and the ship-by date.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {b.opportunities.map((o) => (
                  <li key={o.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <Target className={cn("mt-0.5 h-4 w-4 shrink-0", o.done ? "text-faint" : "text-emerald-400")} strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium", o.done && "text-faint line-through")}>{o.title}</p>
                      <p className="text-[13px] text-muted">
                        {o.ship ? <span className="text-foreground">Ship: {o.ship}</span> : o.kind}
                        {o.window_ends && <span className="text-faint"> · by {formatDate(o.window_ends)}</span>}
                      </p>
                    </div>
                    {!o.done && (
                      <Button size="sm" onClick={async () => { await fetch(`/api/opportunities/${o.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: true }) }); await load(); }}>Done</Button>
                    )}
                    <Button variant="ghost" size="sm" aria-label={`Remove ${o.title}`} onClick={async () => { await fetch(`/api/opportunities/${o.id}`, { method: "DELETE" }); await load(); }}>
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Rail: real event log */}
        <div className="min-w-0 space-y-6">
          <Panel title="Activity" hint="Real things that happened on this campaign.">
            {b.events.length === 0 ? (
              <Empty>Nothing yet. Fans, coverage, reviews and published assets show up here as they land.</Empty>
            ) : (
              <ul className="space-y-3.5">
                {b.events.map((e, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed">
                    <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", EVENT_DOT[e.kind] ?? "bg-faint")} />
                    <span className="min-w-0 flex-1 text-muted">
                      {e.text}
                      <span className="ml-1.5 text-faint">· {timeAgo(e.at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <p className="flex gap-2 px-1 text-[11px] leading-relaxed text-faint">
            <AlertTriangle className="mt-px h-3 w-3 shrink-0" strokeWidth={1.5} />
            Every figure here is a count of something real in your campaign. The Brain does not forecast reach, ROI, or box office.
          </p>
        </div>
      </div>
    </div>
  );
}
