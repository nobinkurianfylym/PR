import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";
import { currentPhase } from "@/server/brain";
import { reasonAboutCall } from "@/server/ai";
import { campaignEvents } from "@/server/events";
import {
  fundamentals, readiness, recommendation, risks, type BrainState,
} from "@/server/strategist";
import type { CampaignPhase } from "@/types";

/** Everything the Campaign Brain (the deep planner) renders, reasoned server-side. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ film: null });

  const d = db();
  const film = await d
    .prepare("SELECT * FROM films WHERE id = ?")
    .bind(filmId)
    .first<Record<string, unknown>>();
  if (!film) return NextResponse.json({ film: null });

  const [phases, missions, team, reviews, assets, links, coverage, competitors, opportunities, events] =
    await Promise.all([
      d.prepare("SELECT phase, date, summary FROM phases WHERE film_id = ? ORDER BY sort").bind(filmId).all(),
      d.prepare("SELECT id, title, detail, impact, due, done, assignee, due_date, asset_id FROM missions WHERE film_id = ? ORDER BY done, rowid").bind(filmId).all(),
      d.prepare("SELECT id, name, role, status FROM team_members WHERE film_id = ? ORDER BY (status='Active') DESC, name").bind(filmId).all(),
      d.prepare("SELECT rating FROM reviews WHERE film_id = ?").bind(filmId).all(),
      d.prepare("SELECT id, type, name FROM assets WHERE film_id = ? AND status = 'approved' ORDER BY created_at DESC").bind(filmId).all(),
      d.prepare("SELECT platform FROM film_links WHERE film_id = ?").bind(filmId).all(),
      d.prepare("SELECT COUNT(*) n FROM shared_links WHERE film_id = ? AND status = 'approved'").bind(filmId).first<{ n: number }>(),
      d.prepare("SELECT id, title, event, event_date, url FROM competitors WHERE film_id = ? ORDER BY event_date, created_at DESC").bind(filmId).all(),
      d.prepare("SELECT id, title, kind, window_ends, ship, done FROM opportunities WHERE film_id = ? ORDER BY done, window_ends, created_at DESC").bind(filmId).all(),
      campaignEvents(d, filmId, 24),
    ]);

  const today = new Date().toISOString().slice(0, 10);
  const phaseRows = phases.results as { phase: CampaignPhase; date: string; summary: string }[];
  const missionRows = missions.results as {
    id: string; title: string; detail: string; impact: string; due: string;
    done: number; assignee: string; due_date: string; asset_id: string;
  }[];
  const teamRows = team.results as { id: string; name: string; role: string; status: string }[];
  const reviewRows = reviews.results as { rating: number }[];
  const assetRows = assets.results as { id: string; type: string; name: string }[];
  const linkRows = links.results as { platform: string }[];

  const phase = currentPhase(phaseRows);
  const daysToRelease = Math.round(
    (new Date(film.release_date as string).getTime() - new Date(today).getTime()) / 864e5,
  );
  const ticketing = new Set(["bookmyshow", "tickets"]);
  const social = new Set(["instagram", "x", "facebook", "youtube", "website"]);

  const state: BrainState = {
    title: film.title as string,
    phase,
    daysToRelease,
    marketingBudget: Number(film.marketing_budget ?? 0),
    missionsTotal: missionRows.length,
    missionsDone: missionRows.filter((m) => m.done).length,
    openMissions: missionRows.filter((m) => !m.done).map(({ id, title, impact, due }) => ({ id, title, impact, due })),
    teamActive: teamRows.filter((t) => t.status === "Active").length,
    reviewCount: reviewRows.length,
    avgRating: reviewRows.length ? reviewRows.reduce((s, r) => s + r.rating, 0) / reviewRows.length : null,
    assetTypes: [...new Set(assetRows.map((a) => a.type))],
    coverageCount: coverage?.n ?? 0,
    hasTicketing: linkRows.some((l) => ticketing.has(l.platform)),
    socialCount: linkRows.filter((l) => social.has(l.platform)).length,
    competitors: competitors.results as BrainState["competitors"],
    opportunities: [],
  };

  const call = recommendation(state);
  const reasoning = await reasonAboutCall(
    {
      title: state.title, genre: String(film.genre ?? ""), language: String(film.language ?? ""),
      phase, daysToRelease, action: call.action, facts: call.evidence,
      fallback: { reasons: call.reasons, unblocks: call.unblocks, alternative: call.alternative },
    },
    (getCloudflareContext().env as unknown as { OPENAI_API_KEY?: string }).OPENAI_API_KEY,
  );

  // Priorities as real tasks: owner, deadline, attached asset, overdue flag.
  const priorities = missionRows
    .filter((m) => !m.done)
    .slice(0, 8)
    .map((m) => {
      const att = m.asset_id ? assetRows.find((a) => a.id === m.asset_id) : undefined;
      return {
        id: m.id, title: m.title, impact: m.impact, due: m.due,
        assignee: m.assignee || null,
        dueDate: m.due_date || null,
        overdue: !!m.due_date && m.due_date < today,
        asset: att ? { id: att.id, type: att.type, name: att.name } : null,
      };
    });

  return NextResponse.json({
    film: { id: filmId, title: state.title, phase, daysToRelease, releaseDate: film.release_date, market: String(film.market ?? "") },
    readiness: readiness(state),
    fundamentals: fundamentals(state),
    recommendation: { ...call, reasons: reasoning.reasons, unblocks: reasoning.unblocks, alternative: reasoning.alternative },
    reasonedBy: reasoning.source,
    priorities,
    phases: phaseRows.map((p) => ({ ...p, status: p.date < today ? "done" : p.phase === phase ? "active" : "upcoming" })),
    risks: risks(state),
    events,
    team: teamRows,
    assets: assetRows,
    competitors: competitors.results,
    opportunities: opportunities.results,
  });
}
