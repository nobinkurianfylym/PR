"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Fan {
  name: string;
  city: string;
  points: number;
  shares: number;
}

const MEDAL = ["text-amber-500", "text-zinc-500", "text-orange-600"];

/**
 * The fan leaderboard — the whole reason to earn points. The top fan is
 * crowned as the Biggest Fan; the rest are ranked below. Refreshes whenever a
 * share awards points anywhere on the page.
 */
export function FanLeaderboard({ slug }: { slug: string }) {
  const [top, setTop] = useState<Fan[]>([]);
  const [totalFans, setTotalFans] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch(`/api/press/${slug}/leaderboard`, { cache: "no-store" });
    if (res.ok) {
      const d = (await res.json()) as { top: Fan[]; totalFans: number };
      setTop(d.top);
      setTotalFans(d.totalFans);
    }
  }, [slug]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onUpdate = () => void load();
    window.addEventListener("fan:update", onUpdate);
    return () => window.removeEventListener("fan:update", onUpdate);
  }, [load]);

  const biggest = top[0];
  const rest = top.slice(1);

  return (
    <section id="fan-club" className="mt-14 scroll-mt-24">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            <Trophy className="h-3.5 w-3.5" strokeWidth={1.5} /> Fan Leaderboard
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">The biggest fans</h2>
        </div>
        {totalFans > 0 && (
          <span className="text-[13px] text-faint">{totalFans} {totalFans === 1 ? "fan" : "fans"}</span>
        )}
      </div>

      {top.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border py-10 text-center text-sm text-faint">
          No points yet — join the fan club and share to top the board.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {biggest && (
            <div className="flex items-center gap-4 overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/15 to-transparent p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/20">
                <Crown className="h-6 w-6 text-amber-500" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold-deep">
                  Biggest fan
                </p>
                <p className="truncate text-lg font-semibold">{biggest.name || "Anonymous fan"}</p>
                {biggest.city && <p className="text-xs text-faint">{biggest.city}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-semibold tabular-nums text-gold-deep">{biggest.points}</p>
                <p className="text-[11px] text-faint">points</p>
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <ol className="divide-y divide-border rounded-2xl border border-border bg-surface">
              {rest.map((f, i) => (
                <li key={i} className="flex items-center gap-4 px-5 py-3">
                  <span className={cn("w-6 shrink-0 text-center text-sm font-semibold tabular-nums", MEDAL[i + 1] ?? "text-faint")}>
                    {i + 2}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{f.name || "Anonymous fan"}</p>
                    {f.city && <p className="text-xs text-faint">{f.city}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-faint">{f.shares} {f.shares === 1 ? "share" : "shares"}</span>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-muted">{f.points} pts</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
