"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check, Gift, Heart, Star, Ticket, Trophy, X as Close } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import type { FanState } from "@/lib/fan-share";

const PERKS = [
  { icon: Bell, text: "Every update, first" },
  { icon: Ticket, text: "Premiere ticket draws" },
  { icon: Gift, text: "Contests & giveaways" },
  { icon: Trophy, text: "Earn points, climb the fan leaderboard" },
];

/**
 * The top-of-page fan control. Before joining it is a single button; the
 * details (perks + sign-up) appear only in a modal on click. Once joined it
 * becomes a live status pill — points and rank — that updates whenever the fan
 * shares. It is the source of the "fan:update" broadcast on join.
 */
export function FanJoinBar({ slug, film }: { slug: string; film: string }) {
  const [state, setState] = useState<FanState | null>(null);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/press/${slug}/fans`, { cache: "no-store" });
    if (res.ok) setState((await res.json()) as FanState);
  }, [slug]);

  useEffect(() => { void load(); }, [load]);

  // Keep the pill live when a share elsewhere on the page awards points.
  useEffect(() => {
    const onUpdate = (e: Event) => setState((e as CustomEvent).detail as FanState);
    window.addEventListener("fan:update", onUpdate);
    return () => window.removeEventListener("fan:update", onUpdate);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch(`/api/press/${slug}/fans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, city }),
    });
    if (res.ok) {
      const data = (await res.json()) as FanState;
      setState(data);
      window.dispatchEvent(new CustomEvent("fan:update", { detail: data }));
      setOpen(false);
    } else {
      setError(((await res.json()) as { error?: string }).error ?? "Couldn't sign you up.");
    }
    setSending(false);
  }

  const joined = state?.fan ?? null;

  return (
    <>
      {joined ? (
        <div className="inline-flex items-center gap-3 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm">
          <Star className="h-4 w-4 text-indigo-500" fill="currentColor" strokeWidth={0} />
          <span className="font-medium">
            {joined.name ? `${joined.name}, you're a fan` : "You're a fan"}
          </span>
          <span className="text-indigo-700">· {joined.points} pts</span>
          {state?.rank && <span className="text-indigo-700">· Rank #{state.rank}</span>}
        </div>
      ) : (
        <Button
          size="lg"
          onClick={() => setOpen(true)}
          className="bg-indigo-500 text-white hover:bg-indigo-400"
        >
          <Heart className="h-4 w-4" fill="currentColor" strokeWidth={0} /> Join the Fan Club
        </Button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Join the fan club"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-indigo-500/25 bg-surface"
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 text-faint transition-colors hover:text-foreground"
            >
              <Close className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <div className="bg-gradient-to-br from-indigo-500/15 to-transparent p-6">
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-indigo-600">
                <Heart className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} /> Fan Club
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Join {film}</h2>
              <ul className="mt-4 space-y-2">
                {PERKS.map((p) => (
                  <li key={p.text} className="flex items-center gap-2.5 text-sm text-muted">
                    <p.icon className="h-4 w-4 shrink-0 text-indigo-600" strokeWidth={1.5} />
                    {p.text}
                  </li>
                ))}
              </ul>
            </div>

            <form onSubmit={join} className="space-y-3 p-6 pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" htmlFor="fj-name">
                  <Input id="fj-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </Field>
                <Field label="City" htmlFor="fj-city">
                  <Input id="fj-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Kochi" />
                </Field>
              </div>
              <Field label="Email" htmlFor="fj-email">
                <Input id="fj-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
              </Field>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" disabled={sending} className="w-full bg-indigo-500 text-white hover:bg-indigo-400">
                {sending ? "Joining…" : "Join & get 20 points"}
              </Button>
              <p className="text-center text-[11px] text-faint">Free. Unsubscribe anytime.</p>
            </form>
          </div>
        </div>
      )}

      {joined && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-faint">
          <Check className="h-3 w-3 text-emerald-400" strokeWidth={2} />
          Share posters, trailers, and reviews below to earn points.
        </p>
      )}
    </>
  );
}
