"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Gift, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useOverview } from "@/hooks/use-overview";

interface RewardRow { id: string; title: string; detail: string }

export default function RewardsPage() {
  const { data } = useOverview();
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/rewards", { cache: "no-store" });
    if (res.ok) setRewards(((await res.json()) as { rewards: RewardRow[] }).rewards);
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (!data?.film) return null;
  const film = data.film;

  async function add() {
    if (!title.trim()) return;
    setSaving(true);
    await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, detail }),
    });
    setTitle("");
    setDetail("");
    setSaving(false);
    await load();
  }

  async function del(id: string) {
    await fetch(`/api/rewards?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            Fan Rewards
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Prizes for your top fans
          </h1>
          <p className="mt-1 text-sm text-muted">
            Shown on {film.title}&rsquo;s fan page — what the top of the leaderboard can win.
          </p>
        </div>
        {film.slug && (
          <a
            href={`/fan/${film.slug}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gold-deep transition-colors hover:underline"
          >
            View fan page <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
          </a>
        )}
      </div>

      <Card className="mt-6">
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
          <Gift className="h-3.5 w-3.5" strokeWidth={1.5} /> Add a prize
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-[10rem] flex-1">
            <Field label="Prize" htmlFor="reward-title">
              <Input
                id="reward-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 2 premiere tickets"
                onKeyDown={(e) => e.key === "Enter" && void add()}
              />
            </Field>
          </div>
          <div className="min-w-[10rem] flex-[2]">
            <Field label="Detail (optional)" htmlFor="reward-detail">
              <Input
                id="reward-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="For the #1 fan of the week"
                onKeyDown={(e) => e.key === "Enter" && void add()}
              />
            </Field>
          </div>
          <Button type="button" onClick={() => void add()} disabled={saving || !title.trim()}>
            {saving ? "Adding…" : "Add"}
          </Button>
        </div>
      </Card>

      <div className="mt-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
          Prizes ({rewards.length})
        </p>
        {rewards.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border py-10 text-center text-sm text-faint">
            No prizes yet. Add one above to give fans a reason to climb the leaderboard.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-border rounded-xl border border-border">
            {rewards.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{r.title}</span>
                  {r.detail && <span className="text-faint"> — {r.detail}</span>}
                </span>
                <button
                  onClick={() => void del(r.id)}
                  aria-label={`Delete ${r.title}`}
                  className="shrink-0 rounded-md p-1 text-faint transition-colors hover:bg-raised hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
