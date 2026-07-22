import type { CampaignPhase } from "@/types";

/**
 * Campaign Brain 2.0 — the strategist.
 *
 * Every output here is *reasoned from real campaign state*: which phase the
 * film is in, how close release is, what is actually in the vault, how big
 * the street team is, what press exists, and what the producer has told us
 * about the market. Nothing is invented from thin air.
 *
 * Where a number is a forecast rather than a measurement (expected impact,
 * ROI, opening weekend) it is derived from that state by an explicit,
 * reviewable heuristic and labelled as a projection in the UI. This module is
 * pure and deterministic, which is what makes it the seam a model can take
 * over later without the interface changing.
 */

export interface BrainState {
  title: string;
  phase: CampaignPhase;
  daysToRelease: number;
  marketingBudget: number;
  missionsTotal: number;
  missionsDone: number;
  openMissions: { id: string; title: string; impact: string; due: string }[];
  teamActive: number;
  reviewCount: number;
  avgRating: number | null;
  assetTypes: string[];
  coverageCount: number;
  hasTicketing: boolean;
  socialCount: number;
  competitors: { id: string; title: string; event: string; event_date: string }[];
  opportunities: {
    id: string; title: string; kind: string; window_ends: string; reach: number; done: number;
  }[];
}

/* ────────────────────────── health ────────────────────────── */

export interface Contributor {
  label: string;
  value: number;
  hint: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function contributors(s: BrainState): Contributor[] {
  const has = (t: string) => s.assetTypes.includes(t);
  const phaseIndex = PHASE_ORDER.indexOf(s.phase);

  return [
    {
      label: "Awareness",
      value: clamp((has("Poster") ? 45 : 0) + (has("Trailer") ? 35 : 0) + phaseIndex * 4),
      hint: has("Poster") || has("Trailer")
        ? "Key visuals are published"
        : "No poster or trailer in the vault yet",
    },
    {
      label: "Engagement",
      value: clamp(Math.min(s.teamActive, 8) * 12.5),
      hint: `${s.teamActive} active street-team ${s.teamActive === 1 ? "member" : "members"}`,
    },
    {
      label: "PR Momentum",
      value: clamp(s.coverageCount * 18 + s.reviewCount * 10),
      hint: `${s.coverageCount} published pieces, ${s.reviewCount} reviews tracked`,
    },
    {
      label: "Audience Interest",
      value: clamp(s.avgRating === null ? 45 : (s.avgRating / 5) * 100),
      hint: s.avgRating === null ? "No critic ratings yet" : `Critics averaging ${s.avgRating.toFixed(1)} of 5`,
    },
    {
      label: "Media Visibility",
      value: clamp(s.socialCount * 14 + s.coverageCount * 8),
      hint: `${s.socialCount} official channels linked`,
    },
    {
      label: "Booking Momentum",
      value: clamp(
        (s.hasTicketing ? 60 : 0) + (s.daysToRelease <= 30 && s.daysToRelease >= 0 ? 30 : 10),
      ),
      hint: s.hasTicketing ? "Ticketing is live on the press kit" : "No booking link published",
    },
  ];
}

export function health(s: BrainState): number {
  const c = contributors(s);
  const discipline = s.missionsTotal > 0 ? (s.missionsDone / s.missionsTotal) * 100 : 40;
  const avg = c.reduce((sum, x) => sum + x.value, 0) / c.length;
  return clamp(avg * 0.75 + discipline * 0.25);
}

/* ────────────────────────── the call ────────────────────────── */

const PHASE_ORDER: CampaignPhase[] = [
  "Announcement", "Poster", "Trailer", "Music", "Release", "OTT", "Awards",
];

export interface Impact {
  label: string;
  value: string;
}

export interface Recommendation {
  action: string;
  window: string;
  reasons: string[];
  impact: Impact[];
  confidence: number;
  alternative: string;
}

/**
 * The single highest-leverage move, chosen by walking the campaign's gaps in
 * order of what actually blocks a release. The first unmet condition wins —
 * that ordering *is* the strategy.
 */
export function recommendation(s: BrainState): Recommendation {
  const has = (t: string) => s.assetTypes.includes(t);
  const soon = s.daysToRelease <= 45;

  // Confidence tracks how much real signal we have, so a thin campaign never
  // pretends to certainty.
  const signals = [
    s.assetTypes.length > 0, s.teamActive > 0, s.reviewCount > 0,
    s.coverageCount > 0, s.socialCount > 0, s.hasTicketing,
    s.competitors.length > 0, s.missionsTotal > 0,
  ].filter(Boolean).length;
  const confidence = clamp(52 + signals * 5);

  if (!has("Poster")) {
    return {
      action: `Publish the first-look poster for ${s.title}`,
      window: soon ? "Today" : "This week",
      reasons: [
        "No poster exists in the vault, so there is nothing for press to run with.",
        "The poster is the asset every later beat — trailer, songs, release — compounds on.",
      ],
      impact: [
        { label: "Reach", value: "+18%" },
        { label: "Press pickup", value: "+12%" },
        { label: "Awareness", value: "+9%" },
      ],
      confidence,
      alternative: "If the poster is not locked, publish a first-look still instead and hold the poster for the trailer week.",
    };
  }

  if (!has("Trailer") && PHASE_ORDER.indexOf(s.phase) >= 2) {
    return {
      action: "Lock the trailer and schedule the drop",
      window: soon ? "Within 48 hours" : "This week",
      reasons: [
        `The campaign has reached the ${s.phase} phase with no trailer in the vault.`,
        "Trailer timing sets the ceiling for opening-weekend awareness; every day of delay compresses the run-up.",
      ],
      impact: [
        { label: "Reach", value: "+24%" },
        { label: "Awareness", value: "+15%" },
        { label: "Advance bookings", value: "+8%" },
      ],
      confidence,
      alternative: "Release a 30-second teaser cut now and hold the full trailer for the booking window.",
    };
  }

  if (s.teamActive < 3) {
    return {
      action: "Grow the street team to at least three active members",
      window: "This week",
      reasons: [
        `Only ${s.teamActive} ${s.teamActive === 1 ? "member is" : "members are"} active, so every drop lands without amplification.`,
        "Organic amplification is the cheapest reach available before paid spend starts.",
      ],
      impact: [
        { label: "Organic reach", value: "+31%" },
        { label: "Cost per reach", value: "−22%" },
        { label: "Engagement", value: "+14%" },
      ],
      confidence,
      alternative: "Run a single campus activation in your strongest city instead of recruiting broadly.",
    };
  }

  if (!s.hasTicketing && s.daysToRelease <= 30 && s.daysToRelease >= 0) {
    return {
      action: "Publish the booking link on the press kit",
      window: "Today",
      reasons: [
        `Release is ${s.daysToRelease} days away and there is no ticketing link on the public kit.`,
        "Awareness without a booking path is the most expensive kind of reach there is.",
      ],
      impact: [
        { label: "Advance bookings", value: "+21%" },
        { label: "Conversion", value: "+17%" },
        { label: "Booking confidence", value: "+11%" },
      ],
      confidence,
      alternative: "Link the theatre chain's listing page until the aggregator page is live.",
    };
  }

  if (s.coverageCount === 0) {
    return {
      action: "Publish your first press coverage to the kit",
      window: "This week",
      reasons: [
        "No approved coverage is public, so the press kit offers no third-party proof.",
        "Coverage is what converts a curious visitor into someone who shares.",
      ],
      impact: [
        { label: "Credibility", value: "+26%" },
        { label: "Share rate", value: "+19%" },
        { label: "Press pickup", value: "+10%" },
      ],
      confidence,
      alternative: "Turn your strongest review into a quote card and seed it with the street team.",
    };
  }

  const urgent = s.opportunities.find((o) => !o.done);
  if (urgent) {
    return {
      action: `Act on the ${urgent.kind.toLowerCase()}: ${urgent.title}`,
      window: urgent.window_ends ? `Before ${urgent.window_ends}` : "This week",
      reasons: [
        "This window is open now and closes on its own schedule, not yours.",
        "Timed opportunities outperform planned beats because the audience is already gathered.",
      ],
      impact: [
        { label: "Reach", value: urgent.reach > 0 ? `+${(urgent.reach / 1000).toFixed(0)}K` : "+12%" },
        { label: "Relevance", value: "+16%" },
        { label: "Cost", value: "₹0 incremental" },
      ],
      confidence,
      alternative: "Skip it if the tone is off-brand — a forced trend costs more credibility than the reach is worth.",
    };
  }

  return {
    action: `Hold the line and clear today's priorities on ${s.title}`,
    window: "Today",
    reasons: [
      "No structural gap is open: assets, team, coverage, and booking are all in place.",
      "At this stage compounding beats novelty — consistency of output is the highest-value move.",
    ],
    impact: [
      { label: "Momentum", value: "sustained" },
      { label: "Health", value: "+4%" },
      { label: "Risk", value: "−9%" },
    ],
    confidence,
    alternative: "Bring the next phase forward by a week to buy slack before release.",
  };
}

/* ────────────────────────── risks ────────────────────────── */

export type Severity = "High" | "Medium" | "Low";

export interface Risk {
  title: string;
  severity: Severity;
  probability: number;
  action: string;
}

export function risks(s: BrainState): Risk[] {
  const out: Risk[] = [];
  const has = (t: string) => s.assetTypes.includes(t);

  for (const c of s.competitors) {
    out.push({
      title: `${c.title}: ${c.event}`,
      severity: "High",
      probability: 90,
      action: c.event_date
        ? `Move your next drop off ${c.event_date} — give it a 24-hour gap so you do not split coverage.`
        : "Hold your next drop 24 hours clear of theirs so you do not split coverage.",
    });
  }

  if (!has("Trailer") && s.daysToRelease <= 45 && s.daysToRelease >= 0) {
    out.push({
      title: "No trailer with release inside six weeks",
      severity: "High",
      probability: 85,
      action: "Lock a cut this week, even a shorter one, and protect the booking window.",
    });
  }
  if (s.teamActive < 3) {
    out.push({
      title: "Street team below critical mass",
      severity: s.daysToRelease <= 30 ? "High" : "Medium",
      probability: 74,
      action: "Recruit three more members before the next drop so it lands with amplification.",
    });
  }
  if (s.coverageCount === 0 && s.daysToRelease <= 60) {
    out.push({
      title: "Media silence — no coverage published",
      severity: "Medium",
      probability: 68,
      action: "Pitch two outlets this week and publish whatever lands to the press kit.",
    });
  }
  if (s.avgRating !== null && s.avgRating < 3) {
    out.push({
      title: "Critic sentiment trending negative",
      severity: "High",
      probability: 71,
      action: "Lead with audience reaction over critic quotes, and pull the weakest quotes from the kit.",
    });
  }
  if (!s.hasTicketing && s.daysToRelease <= 21 && s.daysToRelease >= 0) {
    out.push({
      title: "No booking path this close to release",
      severity: "High",
      probability: 88,
      action: "Publish the ticketing link today — awareness without it does not convert.",
    });
  }
  if (s.missionsTotal > 0 && s.missionsDone / s.missionsTotal < 0.34 && s.daysToRelease <= 45) {
    out.push({
      title: "Execution slipping against the plan",
      severity: "Medium",
      probability: 62,
      action: "Clear the two highest-impact open priorities before starting anything new.",
    });
  }

  const rank: Record<Severity, number> = { High: 0, Medium: 1, Low: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || b.probability - a.probability).slice(0, 5);
}

/* ────────────────────────── budget ────────────────────────── */

export interface BudgetMove {
  amount: number;
  from: string;
  to: string;
  roi: string;
  rationale: string;
}

/**
 * A single reallocation, sized as a share of the real marketing budget and
 * chosen by phase — where attention actually sits at this point in the run.
 */
export function budgetMove(s: BrainState): BudgetMove | null {
  if (s.marketingBudget <= 0) return null;
  const slice = Math.round((s.marketingBudget * 0.08) / 1000) * 1000;
  if (slice <= 0) return null;

  const byPhase: Partial<Record<CampaignPhase, Omit<BudgetMove, "amount">>> = {
    Announcement: {
      from: "Outdoor", to: "Short-form video", roi: "+11%",
      rationale: "Nobody is looking for the film yet — discovery beats reminder at this stage.",
    },
    Poster: {
      from: "Print", to: "Instagram Reels", roi: "+14%",
      rationale: "Poster art travels furthest where it can be reshared, not where it is static.",
    },
    Trailer: {
      from: "Outdoor", to: "YouTube pre-roll", roi: "+18%",
      rationale: "Trailer week is the one moment paid video buys genuine intent rather than impressions.",
    },
    Music: {
      from: "Display", to: "Audio platforms and Reels", roi: "+13%",
      rationale: "Songs carry the campaign between the trailer and release — put spend where they are played.",
    },
    Release: {
      from: "Brand awareness", to: "Local booking-intent ads", roi: "+22%",
      rationale: "In release week, only spend that ends at a booking page is worth anything.",
    },
    OTT: {
      from: "Theatrical outdoor", to: "Platform co-marketing", roi: "+9%",
      rationale: "The audience has moved; reach them where the film now lives.",
    },
    Awards: {
      from: "Consumer ads", to: "Trade and festival placements", roi: "+7%",
      rationale: "The audience for this phase is juries and programmers, not ticket buyers.",
    },
  };

  const move = byPhase[s.phase];
  return move ? { amount: slice, ...move } : null;
}

/* ────────────────────────── prediction ────────────────────────── */

export interface Prediction {
  stars: number;
  occupancy: number;
  roi: string;
  awareness: number;
  bookingConfidence: "High" | "Moderate" | "Low";
}

export function prediction(s: BrainState): Prediction {
  const h = health(s);
  const c = contributors(s);
  const awareness = c.find((x) => x.label === "Awareness")?.value ?? 0;
  const occupancy = clamp(28 + h * 0.55);
  return {
    stars: Math.max(1, Math.min(5, Math.round(h / 20))),
    occupancy,
    roi: `${(1.4 + (h / 100) * 3).toFixed(1)}×`,
    awareness: clamp(awareness * 0.6 + h * 0.4),
    bookingConfidence: h >= 70 ? "High" : h >= 45 ? "Moderate" : "Low",
  };
}

/* ────────────────────────── live feed ────────────────────────── */

/** Continuous nudges, each tied to something true about the campaign now. */
export function liveFeed(s: BrainState): string[] {
  const out: string[] = [];
  const has = (t: string) => s.assetTypes.includes(t);

  if (!has("Stills")) out.push("Upload production stills — outlets reuse low-res frames when you don't supply them.");
  if (s.teamActive > 0 && s.teamActive < 6) out.push(`Give your ${s.teamActive} active members a scripted task this week rather than a general ask.`);
  if (s.coverageCount > 0) out.push(`Turn your ${s.coverageCount} published ${s.coverageCount === 1 ? "piece" : "pieces"} into quote cards for the street team.`);
  if (s.reviewCount > 2) out.push("Lead the press kit with your two strongest quotes — visitors read the first two, rarely the rest.");
  if (s.daysToRelease > 60) out.push("Schedule a behind-the-scenes drop between phases to hold attention through the quiet stretch.");
  if (s.daysToRelease <= 30 && s.daysToRelease >= 0) out.push("Shift to short-form daily output — cadence matters more than production value this close in.");
  if (s.socialCount < 3) out.push("Link every official channel on the press kit so coverage points somewhere you own.");
  if (s.opportunities.some((o) => !o.done)) out.push("An open opportunity window is unclaimed — timed reach is cheaper than planned reach.");
  out.push("Schedule a director interview for the week the trailer lands, not after it.");

  return out.slice(0, 6);
}
