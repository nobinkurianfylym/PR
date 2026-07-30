"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Crown, ShieldCheck, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface PointsFan {
  name: string;
  city: string;
  points: number;
  shares: number;
  verified: number;
}
interface ShareFan {
  name: string;
  city: string;
  ref_joins: number;
  ref_visits: number;
  verified: number;
}

interface Row {
  name: string;
  city: string;
  verified: number;
  big: number;
  bigLabel: string;
  sub: string;
}

const MEDAL = ["text-amber-400", "text-zinc-300", "text-orange-400"];

/**
 * The fan leaderboards — the reason to earn points. Two boards: biggest fans
 * (points) and top sharers (who actually brought new fans in via their share
 * links). The leader is crowned; the rest are ranked. Refreshes on fan:update.
 * Styled for the dark espresso Fan Club block it lives in.
 */
export function FanLeaderboard({ slug }: { slug: string }) {
  const [top, setTop] = useState<PointsFan[]>([]);
  const [sharers, setSharers] = useState<ShareFan[]>([]);
  const [totalFans, setTotalFans] = useState(0);
  const [tab, setTab] = useState<"fans" | "sharers">("fans");
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/press/${slug}/leaderboard`, { cache: "no-store" });
    if (res.ok) {
      const d = (await res.json()) as { top: PointsFan[]; sharers: ShareFan[]; totalFans: number };
      setTop(d.top);
      setSharers(d.sharers);
      setTotalFans(d.totalFans);
    }
  }, [slug]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onUpdate = () => void load();
    window.addEventListener("fan:update", onUpdate);
    return () => window.removeEventListener("fan:update", onUpdate);
  }, [load]);

  const rows: Row[] =
    tab === "fans"
      ? top.map((f) => ({
          name: f.name, city: f.city, verified: f.verified,
          big: f.points, bigLabel: "points", sub: `${f.shares} ${f.shares === 1 ? "share" : "shares"}`,
        }))
      : sharers.map((f) => ({
          name: f.name, city: f.city, verified: f.verified,
          big: f.ref_joins, bigLabel: f.ref_joins === 1 ? "fan brought" : "fans brought",
          sub: `${f.ref_visits} ${f.ref_visits === 1 ? "click" : "clicks"}`,
        }));

  const leader = rows[0];
  const others = rows.slice(1);
  // Show the crowned leader + the next two (top 3) until expanded.
  const VISIBLE = 2;
  const rest = expanded ? others : others.slice(0, VISIBLE);
  const crownLabel = tab === "fans" ? "Biggest fan" : "Top sharer";

  const name = (n: string, v: number) => (
    <span className="inline-flex items-center gap-1.5">
      <span className="truncate">{n || "Anonymous fan"}</span>
      {v === 1 && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={1.5} />}
    </span>
  );

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-soft">
          <Trophy className="h-3.5 w-3.5" strokeWidth={1.5} /> Fan Leaderboard
        </p>
        {totalFans > 0 && (
          <span className="text-[13px] text-white/40">{totalFans} {totalFans === 1 ? "fan" : "fans"}</span>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {(["fans", "sharers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setExpanded(false); }}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              tab === t ? "bg-gold text-white" : "border border-white/15 text-white/60 hover:text-white",
            )}
          >
            {t === "fans" ? "Biggest fans" : "Top sharers"}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-white/15 py-10 text-center text-sm text-white/40">
          {tab === "fans"
            ? "No points yet — join the fan club and share to top the board."
            : "No referrals yet — share your fan link to bring friends and top this board."}
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {leader && (
            <div className="flex items-center gap-4 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/25 to-transparent p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/25">
                <Crown className="h-6 w-6 text-amber-400" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold-soft">{crownLabel}</p>
                <p className="truncate text-lg font-semibold text-[#f3ecdd]">{name(leader.name, leader.verified)}</p>
                {leader.city && <p className="text-xs text-white/40">{leader.city}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-semibold tabular-nums text-gold-soft">{leader.big}</p>
                <p className="text-[11px] text-white/40">{leader.bigLabel}</p>
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <ol className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              {rest.map((f, i) => (
                <li key={i} className="flex items-center gap-4 px-5 py-3">
                  <span className={cn("w-6 shrink-0 text-center text-sm font-semibold tabular-nums", MEDAL[i + 1] ?? "text-white/40")}>
                    {i + 2}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#f3ecdd]">{name(f.name, f.verified)}</p>
                    {f.city && <p className="text-xs text-white/40">{f.city}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-white/40">{f.sub}</span>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-white/70">
                    {f.big} <span className="text-white/40">{tab === "fans" ? "pts" : "★"}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}

          {others.length > VISIBLE && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 py-3 text-[13px] font-semibold text-white/80 transition-colors hover:border-gold/40 hover:text-white"
            >
              {expanded ? "Show less" : `Show all ${rows.length}`}
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                strokeWidth={2}
              />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
