import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { currentPhase, healthScore, recommendations } from "@/server/brain";
import type { CampaignPhase } from "@/types";

/** One payload that powers every signed-in page. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const database = db();
  const film = await database
    .prepare("SELECT * FROM films WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(user.id)
    .first<Record<string, unknown>>();
  if (!film) return NextResponse.json({ user, film: null });

  const filmId = film.id as string;
  const [phases, missions, team, reviews] = await Promise.all([
    database.prepare("SELECT * FROM phases WHERE film_id = ? ORDER BY sort").bind(filmId).all(),
    database.prepare("SELECT * FROM missions WHERE film_id = ? ORDER BY done, rowid").bind(filmId).all(),
    database.prepare("SELECT * FROM team_members WHERE film_id = ? ORDER BY contribution DESC").bind(filmId).all(),
    database.prepare("SELECT * FROM reviews WHERE film_id = ? ORDER BY date DESC").bind(filmId).all(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const phaseRows = phases.results as { phase: CampaignPhase; date: string }[];
  const missionRows = missions.results as { done: number }[];
  const reviewRows = reviews.results as { rating: number }[];
  const teamRows = team.results as { status: string }[];

  const phase = currentPhase(phaseRows);
  const daysToRelease = Math.round(
    (new Date(film.release_date as string).getTime() - new Date(today).getTime()) / 864e5,
  );
  const health = healthScore({
    releaseDate: film.release_date as string,
    missionsDone: missionRows.filter((m) => m.done).length,
    missionsTotal: missionRows.length,
    teamActive: teamRows.filter((t) => t.status === "Active").length,
    reviewCount: reviewRows.length,
    avgRating: reviewRows.length
      ? reviewRows.reduce((s, r) => s + r.rating, 0) / reviewRows.length
      : null,
  });

  return NextResponse.json({
    user,
    film: { ...film, healthScore: health, phase, daysToRelease },
    phases: phaseRows.map((p) => ({
      ...p,
      status: p.date < today ? "done" : p.phase === phase ? "active" : "upcoming",
    })),
    missions: missions.results,
    team: team.results,
    reviews: reviews.results,
    ai: recommendations({
      title: film.title as string,
      phase,
      daysToRelease,
      openMissions: missionRows.filter((m) => !m.done).length,
      teamActive: teamRows.filter((t) => t.status === "Active").length,
      reviewCount: reviewRows.length,
      health,
    }),
  });
}
