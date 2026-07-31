"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownRight, ArrowUpRight, CalendarClock, Check, ExternalLink, Eye,
  Film, Loader2, MessageSquareQuote, Newspaper, RefreshCw, Ticket, TrendingUp, Users, X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { api, formatDate, useOverview } from "@/hooks/use-overview";
import { cn } from "@/lib/utils";

interface Metrics {
  daysToRelease: number;
  releaseDate: string;
  market: string;
  bookingStatus: string;
  fans: { total: number; thisWeek: number; prevWeek: number };
  coverage: { live: number; pending: number };
  reviews: number;
  trailer: { videoId: string; views: number; likes: number; comments: number; velocityPerDay: number | null; fetchedAt: string } | null;
  hasTrailerLink: boolean;
  pendingCoverage: { id: string; url: string; label: string; kind: string; note: string }[];
}

const compact = (n: number) => Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const BOOKING = ["Not open", "Open", "Fast filling", "Houseful"];

function Tile({ icon: Icon, label, children }: { icon: typeof Eye; label: string; children: React.ReactNode }) {
  return (
    <Card className="min-w-0">
      <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-faint">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} /> {label}
      </p>
      <div className="mt-2">{children}</div>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, refresh } = useOverview();
  const [m, setM] = useState<Metrics | null>(null);
  const [ytBusy, setYtBusy] = useState(false);
  const [ytMsg, setYtMsg] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [busyLink, setBusyLink] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    const res = await fetch("/api/overview", { cache: "no-store" });
    if (res.ok) setM(((await res.json()) as { metrics: Metrics }).metrics);
  }, []);
  useEffect(() => { if (data?.film) void loadMetrics(); }, [data?.film, loadMetrics]);

  if (!data?.film || !m) return null;
  const { film } = data;
  const today = new Date().toISOString().slice(0, 10);

  async function refreshTrailer() {
    setYtBusy(true); setYtMsg(null);
    const res = await fetch("/api/youtube", { method: "POST" });
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setYtMsg(d.error ?? "Couldn't refresh.");
    await loadMetrics();
    setYtBusy(false);
  }
  async function setBooking(status: string) {
    setM((prev) => (prev ? { ...prev, bookingStatus: status } : prev));
    await fetch("/api/booking", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  }
  async function scanCoverage() {
    setScanning(true); setScanMsg(null);
    const res = await fetch("/api/shared-links/crawl", { method: "POST" });
    const d = (await res.json().catch(() => ({}))) as { added?: number; error?: string };
    setScanMsg(res.ok ? `Found ${d.added ?? 0} new to review.` : d.error ?? "Couldn't scan.");
    await loadMetrics();
    setScanning(false);
  }
  async function approveLink(id: string) {
    setBusyLink(id);
    await fetch(`/api/shared-links/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) });
    await loadMetrics(); setBusyLink(null);
  }
  async function dismissLink(id: string) {
    setBusyLink(id);
    await fetch(`/api/shared-links/${id}`, { method: "DELETE" });
    await loadMetrics(); setBusyLink(null);
  }

  const fanDelta = m.fans.thisWeek - m.fans.prevWeek;
  const dueOf = (t: unknown) => (t as { due_date?: string }).due_date ?? "";
  const tasks = [...data.missions.filter((t) => !t.done)].sort((a, b) => {
    const rank = (x: unknown) => {
      const d = dueOf(x);
      if (d && d < today) return 0;
      if (d === today) return 1;
      return 2;
    };
    return rank(a) - rank(b);
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">War Room</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Film className="h-5 w-5 text-faint" strokeWidth={1.5} /> {film.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {film.phase} phase · releases {formatDate(m.releaseDate)}
          </p>
        </div>
        <Link href="/brain" className="text-sm text-faint underline-offset-2 hover:text-foreground hover:underline">
          Open Campaign Brain →
        </Link>
      </header>

      {/* Real, glanceable tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tile icon={CalendarClock} label="Days to release">
          <p className="text-3xl font-semibold tabular-nums">{Math.max(m.daysToRelease, 0)}</p>
          <p className="mt-0.5 text-xs text-faint">{m.daysToRelease < 0 ? "in release" : "days out"}</p>
        </Tile>

        <Tile icon={Eye} label="Trailer views">
          {m.trailer ? (
            <>
              <p className="text-3xl font-semibold tabular-nums">{compact(m.trailer.views)}</p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-faint">
                {m.trailer.velocityPerDay !== null && (
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <TrendingUp className="h-3 w-3" strokeWidth={2} /> +{compact(m.trailer.velocityPerDay)}/day
                  </span>
                )}
                {compact(m.trailer.likes)} likes
                <button onClick={() => void refreshTrailer()} disabled={ytBusy} aria-label="Refresh views" className="ml-auto text-faint hover:text-foreground">
                  {ytBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />}
                </button>
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-muted">{m.hasTrailerLink ? "Not fetched" : "No trailer link"}</p>
              {m.hasTrailerLink ? (
                <button onClick={() => void refreshTrailer()} disabled={ytBusy} className="mt-1 inline-flex items-center gap-1.5 text-xs text-foreground underline-offset-2 hover:underline">
                  {ytBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />} Fetch views
                </button>
              ) : (
                <Link href="/films/edit" className="mt-1 inline-block text-xs text-foreground underline-offset-2 hover:underline">Add a YouTube link →</Link>
              )}
              {ytMsg && <p className="mt-1 text-[11px] text-amber-400">{ytMsg}</p>}
            </>
          )}
        </Tile>

        <Tile icon={Ticket} label="Advance booking">
          <select
            value={m.bookingStatus} onChange={(e) => void setBooking(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-raised px-2 text-sm text-foreground"
          >
            <option value="">Set status…</option>
            {BOOKING.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <p className="mt-1 text-xs text-faint">You log this as it changes.</p>
        </Tile>

        <Tile icon={Users} label="Fan club">
          <p className="text-3xl font-semibold tabular-nums">{compact(m.fans.total)}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs">
            <span className="text-faint">+{m.fans.thisWeek} this week</span>
            {m.fans.prevWeek > 0 && (
              <span className={cn("inline-flex items-center gap-0.5", fanDelta >= 0 ? "text-emerald-400" : "text-red-400")}>
                {fanDelta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                vs {m.fans.prevWeek}
              </span>
            )}
          </p>
        </Tile>

        <Tile icon={Newspaper} label="Coverage live">
          <p className="text-3xl font-semibold tabular-nums">{m.coverage.live}</p>
          <p className="mt-0.5 text-xs text-faint">{m.coverage.pending > 0 ? `${m.coverage.pending} awaiting review` : "on the press kit"}</p>
        </Tile>

        <Tile icon={MessageSquareQuote} label="Reviews tracked">
          <p className="text-3xl font-semibold tabular-nums">{m.reviews}</p>
          <Link href="/reviews" className="mt-0.5 inline-block text-xs text-faint underline-offset-2 hover:text-foreground hover:underline">Review Wall →</Link>
        </Tile>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* What needs me today */}
        <Card>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">What needs me today</p>
            <span className="text-xs text-faint">{tasks.length} open</span>
          </div>
          {tasks.length === 0 ? (
            <p className="mt-3 text-sm text-faint">Nothing open. Set the next move in the Campaign Brain.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {tasks.slice(0, 8).map((t) => {
                const dd = dueOf(t);
                const who = (t as unknown as { assignee?: string }).assignee;
                const overdue = dd && dd < today;
                return (
                  <li key={t.id} className="group flex items-start gap-3 py-2.5">
                    <button
                      onClick={async () => { await api.toggleMission(t.id, true); await refresh(); await loadMetrics(); }}
                      aria-label="Mark done"
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border border-border transition-colors hover:border-emerald-500 hover:bg-emerald-500/10"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-500 opacity-0 group-hover:opacity-100" strokeWidth={2.5} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-faint">
                        {who && <span>{who}</span>}
                        {dd ? (
                          <span className={cn(overdue && "font-medium text-red-400")}>
                            {overdue ? "Overdue · " : "Due "}{formatDate(dd)}
                          </span>
                        ) : (
                          <span>No deadline set</span>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Coverage radar */}
        <Card>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium">Coverage radar</p>
            <button onClick={() => void scanCoverage()} disabled={scanning} className="inline-flex items-center gap-1.5 text-xs text-faint hover:text-foreground">
              {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />}
              {scanning ? "Scanning…" : "Scan the web"}
            </button>
          </div>
          {scanMsg && <p className="mt-1 text-[11px] text-muted">{scanMsg}</p>}
          {m.pendingCoverage.length === 0 ? (
            <p className="mt-3 text-sm text-faint">No coverage awaiting review. Scan to find real mentions of {film.title}.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {m.pendingCoverage.slice(0, 6).map((l) => (
                <li key={l.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start gap-2">
                    <a href={l.url} target="_blank" rel="noopener" className="min-w-0 flex-1 text-[13px] font-medium hover:text-foreground">
                      <span className="line-clamp-2">{l.label || l.url}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-faint"><ExternalLink className="h-3 w-3" /> {l.kind}</span>
                    </a>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => void approveLink(l.id)} disabled={busyLink === l.id} aria-label="Publish to kit" className="rounded-md p-1 text-faint hover:bg-raised hover:text-emerald-400">
                        {busyLink === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2} />}
                      </button>
                      <button onClick={() => void dismissLink(l.id)} disabled={busyLink === l.id} aria-label="Dismiss" className="rounded-md p-1 text-faint hover:bg-raised hover:text-red-400">
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
