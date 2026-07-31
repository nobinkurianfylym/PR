import type { D1Client } from "./db";

/**
 * The campaign event log — real things that actually happened, each with the
 * true timestamp from its own row. Nothing is synthesised: a fan joined, a
 * review was added, coverage was published, an asset went live. Read-only and
 * derived, so it can never drift from the data.
 */
export type EventKind = "fan" | "review" | "coverage" | "asset";

export interface CampaignEvent {
  kind: EventKind;
  text: string;
  at: string; // ISO-ish timestamp for sorting/display
}

function norm(ts: string): string {
  // D1 stores "YYYY-MM-DD HH:MM:SS"; reviews store "YYYY-MM-DD".
  return ts.includes(" ") ? ts.replace(" ", "T") + "Z" : `${ts}T00:00:00Z`;
}

export async function campaignEvents(
  d: D1Client,
  filmId: string,
  limit = 30,
): Promise<CampaignEvent[]> {
  const [fans, reviews, coverage, assets] = await Promise.all([
    d.prepare("SELECT name, city, created_at FROM fans WHERE film_id = ? ORDER BY created_at DESC LIMIT ?")
      .bind(filmId, limit).all<{ name: string; city: string; created_at: string }>(),
    d.prepare("SELECT quote, publication, critic, date FROM reviews WHERE film_id = ? ORDER BY date DESC, rowid DESC LIMIT ?")
      .bind(filmId, limit).all<{ quote: string; publication: string; critic: string; date: string }>(),
    d.prepare("SELECT label, url, kind, status, created_at FROM shared_links WHERE film_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT ?")
      .bind(filmId, limit).all<{ label: string; url: string; kind: string; status: string; created_at: string }>(),
    d.prepare("SELECT type, name, created_at FROM assets WHERE film_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT ?")
      .bind(filmId, limit).all<{ type: string; name: string; created_at: string }>(),
  ]);

  const out: CampaignEvent[] = [];

  for (const f of fans.results) {
    const who = f.name?.trim() || "A fan";
    out.push({ kind: "fan", text: `${who}${f.city ? ` (${f.city})` : ""} joined the fan club`, at: norm(f.created_at) });
  }
  for (const r of reviews.results) {
    const src = r.publication || r.critic || "A critic";
    out.push({ kind: "review", text: `Review added — ${src}`, at: norm(r.date) });
  }
  for (const c of coverage.results) {
    const host = (() => { try { return new URL(c.url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
    out.push({ kind: "coverage", text: `Coverage published — ${c.label || host || c.kind}`, at: norm(c.created_at) });
  }
  for (const a of assets.results) {
    out.push({ kind: "asset", text: `${a.type} published${a.name ? ` — ${a.name}` : ""}`, at: norm(a.created_at) });
  }

  return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, limit);
}
