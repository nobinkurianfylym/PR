"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Mail, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { formatDate, useOverview } from "@/hooks/use-overview";

interface FanStats {
  totalSignups: number;
  uniqueFans: number;
  perFilm: { film_id: string; title: string; fans: number }[];
  recent: { name: string; email: string; city: string; created_at: string; film: string }[];
}
interface Broadcast {
  id: string; scope: string; subject: string;
  recipient_count: number; sent_count: number; status: string; created_at: string;
}

export default function AdminPage() {
  const { data } = useOverview();
  const [stats, setStats] = useState<FanStats | null>(null);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [emailReady, setEmailReady] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [scope, setScope] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    const fansRes = await fetch("/api/admin/fans", { cache: "no-store" });
    if (fansRes.status === 403) { setForbidden(true); return; }
    if (fansRes.ok) setStats((await fansRes.json()) as FanStats);
    const bRes = await fetch("/api/admin/broadcasts", { cache: "no-store" });
    if (bRes.ok) {
      const d = (await bRes.json()) as { broadcasts: Broadcast[]; emailConfigured: boolean };
      setBroadcasts(d.broadcasts);
      setEmailReady(d.emailConfigured);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // Client guard mirrors the server one; the API is the real gate.
  if (forbidden || (data && data.isMasterAdmin === false)) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h1 className="text-xl font-semibold">Master admin only</h1>
        <p className="mt-2 text-sm text-muted">This console is limited to PR.FYLYM administrators.</p>
      </div>
    );
  }
  if (!stats) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);
    const res = await fetch("/api/admin/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, subject, body }),
    });
    if (res.ok) {
      const d = (await res.json()) as { recipients: number; sent: number; delivered: boolean };
      setResult(
        d.delivered
          ? `Sent to ${d.sent} of ${d.recipients} fans.`
          : `Saved for ${d.recipients} fans. Email delivery isn't configured yet — export the list to send, or add a provider key.`,
      );
      setSubject(""); setBody("");
      await load();
    } else {
      setResult(((await res.json()) as { error?: string }).error ?? "Couldn't send.");
    }
    setSending(false);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">
          PR.FYLYM · Master Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Fan database</h1>
        <p className="mt-1 text-sm text-muted">
          Everyone who joined a fan club, across every campaign on the platform.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">Total sign-ups</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{stats.totalSignups}</p>
        </Card>
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">Unique fans</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{stats.uniqueFans}</p>
        </Card>
        <Card className="flex flex-col justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">Export</p>
          <a href="/api/admin/fans/export" className="mt-2">
            <Button variant="outline" size="sm" className="w-full">
              <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Download CSV
            </Button>
          </a>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted" strokeWidth={1.5} />
          <p className="text-sm font-medium">Message fans</p>
          <span className={`ml-auto rounded-full border px-2 py-0.5 text-[11px] ${emailReady ? "border-emerald-900 text-emerald-400" : "border-amber-900 text-amber-400"}`}>
            {emailReady ? "Delivery live" : "Delivery not configured"}
          </span>
        </div>
        <form onSubmit={send} className="mt-4 space-y-4">
          <Field label="Audience" htmlFor="scope">
            <select
              id="scope" value={scope} onChange={(e) => setScope(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-raised px-3 text-sm text-foreground"
            >
              <option value="all">All fans ({stats.uniqueFans})</option>
              {stats.perFilm.map((f) => (
                <option key={f.film_id} value={f.film_id}>{f.title} ({f.fans})</option>
              ))}
            </select>
          </Field>
          <Field label="Subject" htmlFor="subject">
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </Field>
          <div>
            <label htmlFor="body" className="mb-1.5 block text-[13px] font-medium text-muted">Message</label>
            <textarea
              id="body" value={body} onChange={(e) => setBody(e.target.value)} required rows={6}
              className="w-full rounded-lg border border-border bg-raised p-3 text-sm text-foreground"
              placeholder="Contest details, premiere ticket draw, a new trailer…"
            />
          </div>
          {result && <p className="text-[13px] text-muted">{result}</p>}
          <Button type="submit" disabled={sending}>
            <Send className="h-4 w-4" strokeWidth={1.5} /> {sending ? "Sending…" : emailReady ? "Send message" : "Save message"}
          </Button>
        </form>
      </Card>

      {stats.perFilm.length > 0 && (
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">Fans by film</p>
          <div className="mt-3 divide-y divide-border">
            {stats.perFilm.map((f) => (
              <div key={f.film_id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="truncate">{f.title}</span>
                <span className="tabular-nums text-muted">{f.fans}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
          <Users className="h-3.5 w-3.5" strokeWidth={1.5} /> Recent sign-ups
        </p>
        {stats.recent.length === 0 ? (
          <p className="mt-3 text-sm text-faint">No fans yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {stats.recent.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-x-4 py-2.5 text-[13px]">
                <span className="min-w-0 flex-1 truncate font-medium">{r.name || r.email}</span>
                <span className="text-faint">{r.email}</span>
                <span className="text-faint">{r.film}</span>
                <span className="text-faint">{formatDate(r.created_at.slice(0, 10))}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {broadcasts.length > 0 && (
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">Sent messages</p>
          <div className="mt-3 divide-y divide-border">
            {broadcasts.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-x-4 py-2.5 text-[13px]">
                <span className="min-w-0 flex-1 truncate font-medium">{b.subject}</span>
                <span className="text-faint">{b.sent_count}/{b.recipient_count} sent</span>
                <span className={b.status === "sent" ? "text-emerald-400" : "text-faint"}>{b.status}</span>
                <span className="text-faint">{formatDate(b.created_at.slice(0, 10))}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
