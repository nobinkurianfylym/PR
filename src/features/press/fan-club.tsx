"use client";

import { useState } from "react";
import { Check, Bell, Gift, Ticket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

/**
 * Fan club sign-up on a public press kit. No account — anyone gives their
 * email to get updates, enter contests, and go in the draw for premiere
 * tickets. Everyone who joins lands in the PR.FYLYM fan database.
 */
const PERKS = [
  { icon: Bell, text: "Every update, first" },
  { icon: Ticket, text: "Premiere ticket draws" },
  { icon: Gift, text: "Contests & giveaways" },
];

export function FanClub({ slug, film }: { slug: string; film: string }) {
  const [joined, setJoined] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch(`/api/press/${slug}/fans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, city }),
    });
    if (res.ok) setJoined(true);
    else setError(((await res.json()) as { error?: string }).error ?? "Couldn't sign you up.");
    setSending(false);
  }

  return (
    <section id="fan-club" className="mt-14 scroll-mt-24">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="grid gap-8 p-6 md:grid-cols-2 md:p-8">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
              <Users className="h-3.5 w-3.5" strokeWidth={1.5} /> Fan Club
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Join the {film} fan club
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Be first to everything — and go in the draw for premiere tickets.
            </p>
            <ul className="mt-5 space-y-2.5">
              {PERKS.map((p) => (
                <li key={p.text} className="flex items-center gap-2.5 text-sm text-muted">
                  <p.icon className="h-4 w-4 shrink-0 text-foreground" strokeWidth={1.5} />
                  {p.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center">
            {joined ? (
              <div className="flex w-full items-center gap-3 rounded-xl border border-emerald-900 bg-background px-5 py-6 text-sm text-emerald-400">
                <Check className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                You&apos;re in. Watch your inbox — updates and contests are on the way.
              </div>
            ) : (
              <form onSubmit={submit} className="w-full space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name" htmlFor="fan-name">
                    <Input id="fan-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                  </Field>
                  <Field label="City" htmlFor="fan-city">
                    <Input id="fan-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Kochi" />
                  </Field>
                </div>
                <Field label="Email" htmlFor="fan-email">
                  <Input
                    id="fan-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                </Field>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button type="submit" className="w-full" disabled={sending}>
                  {sending ? "Joining…" : "Join the fan club"}
                </Button>
                <p className="text-center text-[11px] text-faint">
                  Free. Unsubscribe anytime.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
