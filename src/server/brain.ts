import { CAMPAIGN_PHASES, type CampaignPhase } from "@/types";

/**
 * Campaign Brain v1 — deterministic rules, the seam where the model-driven
 * planner lands in Phase 2. Given a film, it plans the publicity arc
 * relative to the release date, seeds the first missions, scores campaign
 * health from real campaign state, and writes the sidebar recommendations.
 */

/** Offset of each phase from release day, in days (negative = before). */
const PHASE_OFFSETS: Record<CampaignPhase, number> = {
  Announcement: -120,
  Poster: -60,
  Trailer: -30,
  Music: -21,
  Release: 0,
  OTT: 49,
  Awards: 110,
};

const PHASE_SUMMARIES: Record<CampaignPhase, string> = {
  Announcement: "Title reveal and first look. Establish the film's identity in one image.",
  Poster: "Poster wave — one drop a week builds a drumbeat toward the trailer.",
  Trailer: "The main trailer. Time it to peak exactly as booking opens.",
  Music: "Singles and the audio launch carry momentum through the final stretch.",
  Release: "Theatrical release week: premiere, junket, and the street team at full push.",
  OTT: "The digital window opens — a second publicity wave for a new audience.",
  Awards: "Submissions, screeners, and the festival circuit.",
};

export interface PlannedPhase {
  phase: CampaignPhase;
  date: string;
  summary: string;
  sort: number;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function planCampaign(releaseDate: string): PlannedPhase[] {
  const release = new Date(releaseDate + "T00:00:00Z");
  const today = new Date();
  return CAMPAIGN_PHASES.map((phase, sort) => {
    const planned = new Date(release.getTime() + PHASE_OFFSETS[phase] * 864e5);
    // Never plan a phase in the past — a late-started campaign compresses.
    const date = planned < today && phase !== "Release" ? today : planned;
    return { phase, date: iso(date), summary: PHASE_SUMMARIES[phase], sort };
  });
}

export interface SeedMission {
  title: string;
  detail: string;
  impact: "High" | "Medium" | "Low";
  due: string;
}

export function seedMissions(title: string): SeedMission[] {
  return [
    {
      title: `Write the one-line pitch for ${title}`,
      detail: "Every asset, caption, and pitch email starts from this sentence.",
      impact: "High",
      due: "Today",
    },
    {
      title: "Lock the announcement date",
      detail: "The first phase on your timeline — everything else is paced from it.",
      impact: "High",
      due: "This week",
    },
    {
      title: "Invite your first three street-team members",
      detail: "Fans, campus contacts, theatre owners — the people who amplify every drop.",
      impact: "Medium",
      due: "This week",
    },
    {
      title: "Upload the first-look still",
      detail: "The image that carries the announcement.",
      impact: "Medium",
      due: "This week",
    },
  ];
}

export interface HealthInput {
  releaseDate: string;
  missionsDone: number;
  missionsTotal: number;
  teamActive: number;
  reviewCount: number;
  avgRating: number | null;
}

/**
 * Publicity Health Score™ v1: a transparent weighted blend of campaign
 * discipline (missions), amplification (team), and reception (reviews).
 */
export function healthScore(h: HealthInput): number {
  const missionRatio = h.missionsTotal > 0 ? h.missionsDone / h.missionsTotal : 0;
  const teamScore = Math.min(h.teamActive / 5, 1);
  const reviewScore =
    h.reviewCount === 0 ? 0.5 : Math.min(((h.avgRating ?? 0) / 5) * (0.6 + Math.min(h.reviewCount, 8) * 0.05), 1);
  const score = 30 + missionRatio * 30 + teamScore * 20 + reviewScore * 20;
  return Math.round(Math.min(score, 99));
}

export function currentPhase(phases: { phase: CampaignPhase; date: string }[]): CampaignPhase {
  const today = iso(new Date());
  const active = [...phases].reverse().find((p) => p.date <= today);
  return active?.phase ?? "Announcement";
}

export function recommendations(input: {
  title: string;
  phase: CampaignPhase;
  daysToRelease: number;
  openMissions: number;
  teamActive: number;
  reviewCount: number;
  health: number;
}): { today: string; nextAction: string; summary: string } {
  const { title, phase, daysToRelease, openMissions, teamActive, reviewCount, health } = input;
  const today =
    openMissions > 0
      ? `Clear today's ${openMissions} open ${openMissions === 1 ? "priority" : "priorities"} first — mission discipline is the strongest driver of your health score at this stage.`
      : `All priorities are clear. Use the slack to get ahead of the ${phase} phase before the calendar forces it.`;
  const nextAction =
    teamActive < 3
      ? "Grow the street team to at least three active members — amplification is your cheapest reach."
      : reviewCount === 0
        ? "Add the first press mentions to the Review Wall so quote cards are ready before release week."
        : "Turn your best review into a quote card and hand it to the street team.";
  const summary = `${title} is in the ${phase} phase, ${Math.max(daysToRelease, 0)} days from release. Health is ${health}. ${
    teamActive > 0 ? `${teamActive} street-team member${teamActive === 1 ? "" : "s"} active` : "No street team yet"
  }; ${reviewCount > 0 ? `${reviewCount} review${reviewCount === 1 ? "" : "s"} on the wall` : "no reviews tracked yet"}.`;
  return { today, nextAction, summary };
}
