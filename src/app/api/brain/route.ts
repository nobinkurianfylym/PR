import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";
import { currentPhase } from "@/server/brain";
import {
  budgetMove, fundamentals, liveFeed, readiness, recommendation, risks,
  type BrainState,
} from "@/server/strategist";
import type { CampaignPhase } from "@/types";

/** Everything the Campaign Brain screen renders, reasoned server-side. */
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

  const [phases, missions, team, reviews, assets, links, coverage, competitors, opportunities] =
    await Promise.all([
      d.prepare("SELECT phase, date, summary FROM phases WHERE film_id = ? ORDER BY sort").bind(filmId).all(),
      d.prepare("SELECT id, title, detail, impact, due, done FROM missions WHERE film_id = ? ORDER BY done, rowid").bind(filmId).all(),
      d.prepare("SELECT status FROM team_members WHERE film_id = ?").bind(filmId).all(),
      d.prepare("SELECT rating FROM reviews WHERE film_id = ?").bind(filmId).all(),
      d.prepare("SELECT DISTINCT type FROM assets WHERE film_id = ? AND status = 'approved'").bind(filmId).all(),
      d.prepare("SELECT platform FROM film_links WHERE film_id = ?").bind(filmId).all(),
      d.prepare("SELECT COUNT(*) n FROM shared_links WHERE film_id = ? AND status = 'approved'").bind(filmId).first<{ n: number }>(),
      d.prepare("SELECT id, title, event, event_date FROM competitors WHERE film_id = ? ORDER BY created_at DESC").bind(filmId).all(),
      d.prepare("SELECT id, title, kind, window_ends, reach, done FROM opportunities WHERE film_id = ? ORDER BY done, created_at DESC").bind(filmId).all(),
    ]);

  const today = new Date().toISOString().slice(0, 10);
  const phaseRows = phases.results as { phase: CampaignPhase; date: string; summary: string }[];
  const missionRows = missions.results as { id: string; title: string; detail: string; impact: string; due: string; done: number }[];
  const teamRows = team.results as { status: string }[];
  const reviewRows = reviews.results as { rating: number }[];
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
    assetTypes: (assets.results as { type: string }[]).map((a) => a.type),
    coverageCount: coverage?.n ?? 0,
    hasTicketing: linkRows.some((l) => ticketing.has(l.platform)),
    socialCount: linkRows.filter((l) => social.has(l.platform)).length,
    competitors: competitors.results as BrainState["competitors"],
    opportunities: opportunities.results as BrainState["opportunities"],
  };

  return NextResponse.json({
    film: { id: filmId, title: state.title, phase, daysToRelease, releaseDate: film.release_date },
    readiness: readiness(state),
    fundamentals: fundamentals(state),
    recommendation: recommendation(state),
    priorities: state.openMissions.slice(0, 5),
    phases: phaseRows.map((p) => ({
      ...p,
      status: p.date < today ? "done" : p.phase === phase ? "active" : "upcoming",
    })),
    risks: risks(state),
    budget: budgetMove(state),
    feed: liveFeed(state),
    competitors: state.competitors,
    opportunities: state.opportunities,
  });
}
