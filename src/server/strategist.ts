import type { CampaignPhase } from "@/types";

/**
 * Campaign Brain — the strategist.
 *
 * TRUTH RULE: this module may only state things that are true.
 *
 * That means every number it emits is a *count of something real* in the
 * campaign — assets in the vault, active street-team members, published
 * coverage, reviews tracked, days to release. There are no forecast
 * percentages, no probabilities, no predicted ROI, and no confidence scores,
 * because we have no basis on which to compute any of them. Where the Brain
 * exercises judgement (which gap to close first, how serious a risk is, where
 * to move budget) it says so in words and shows the facts that led there, so
 * a producer can disagree with the reasoning rather than trust a number.
 *
 * The one derived figure is Campaign Readiness, and it is defined precisely:
 * the share of tracked fundamentals that are in place. It is a checklist
 * score, and the UI shows every item behind it.
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

/* ───────────────────── readiness: a checklist, not a rating ───────────────────── */

export interface Fundamental {
  label: string;
  /** The real state, in words a producer can check against reality. */
  fact: string;
  met: boolean;
}

export function fundamentals(s: BrainState): Fundamental[] {
  const has = (t: string) => s.assetTypes.includes(t);
  const assetCount = ["Poster", "Trailer", "Stills", "EPK"].filter(has).length;

  return [
    { label: "Poster in the vault", fact: has("Poster") ? "Published" : "None uploaded", met: has("Poster") },
    { label: "Trailer in the vault", fact: has("Trailer") ? "Published" : "None uploaded", met: has("Trailer") },
    { label: "Stills for press", fact: has("Stills") ? "Published" : "None uploaded", met: has("Stills") },
    { label: "Press kit assets", fact: `${assetCount} of 4 key types`, met: assetCount >= 3 },
    {
      label: "Street team",
      fact: `${s.teamActive} active ${s.teamActive === 1 ? "member" : "members"}`,
      met: s.teamActive >= 3,
    },
    {
      label: "Published coverage",
      fact: `${s.coverageCount} ${s.coverageCount === 1 ? "piece" : "pieces"} live on the kit`,
      met: s.coverageCount >= 1,
    },
    {
      label: "Critic reviews",
      fact: s.reviewCount === 0
        ? "None tracked"
        : `${s.reviewCount} tracked${s.avgRating !== null ? `, averaging ${s.avgRating.toFixed(1)} of 5` : ""}`,
      met: s.reviewCount >= 1,
    },
    {
      label: "Official channels",
      fact: `${s.socialCount} linked`,
      met: s.socialCount >= 3,
    },
    {
      label: "Booking path",
      fact: s.hasTicketing ? "Ticketing link published" : "No ticketing link",
      met: s.hasTicketing,
    },
    {
      label: "Priorities cleared",
      fact: s.missionsTotal === 0
        ? "No priorities yet"
        : `${s.missionsDone} of ${s.missionsTotal} done`,
      met: s.missionsTotal > 0 && s.missionsDone / s.missionsTotal >= 0.6,
    },
  ];
}

/** Share of tracked fundamentals in place. Nothing more is claimed. */
export function readiness(s: BrainState): { met: number; total: number; percent: number } {
  const f = fundamentals(s);
  const met = f.filter((x) => x.met).length;
  return { met, total: f.length, percent: Math.round((met / f.length) * 100) };
}

/* ───────────────────── the call ───────────────────── */

const PHASE_ORDER: CampaignPhase[] = [
  "Announcement", "Poster", "Trailer", "Music", "Release", "OTT", "Awards",
];

export interface Recommendation {
  action: string;
  window: string;
  /** Why this, now — reasoning, presented as reasoning. */
  reasons: string[];
  /** The facts behind the call. Each is a real count or state. */
  evidence: { label: string; value: string }[];
  /** What closing this gap makes possible. Qualitative on purpose. */
  unblocks: string;
  alternative: string;
}

/**
 * The highest-leverage move, chosen by walking the campaign's gaps in the
 * order they block a release. The ordering is the strategy; the first unmet
 * condition wins.
 */
export function recommendation(s: BrainState): Recommendation {
  const has = (t: string) => s.assetTypes.includes(t);
  const soon = s.daysToRelease <= 45;
  const days = `${Math.max(s.daysToRelease, 0)} days to release`;

  if (!has("Poster")) {
    return {
      action: `Publish the first-look poster for ${s.title}`,
      window: soon ? "Today" : "This week",
      reasons: [
        "No poster exists in the vault, so press have no image to run with.",
        "Key art is what every later beat — trailer, songs, release — compounds on.",
      ],
      evidence: [
        { label: "Posters in vault", value: "0" },
        { label: "Assets published", value: String(s.assetTypes.length) },
        { label: "Timeline", value: days },
      ],
      unblocks: "Press pickup, poster-led social, and every asset that references the key art.",
      alternative: "If the poster is not locked, publish a first-look still and hold the poster for trailer week.",
    };
  }

  if (!has("Trailer") && PHASE_ORDER.indexOf(s.phase) >= 2) {
    return {
      action: "Lock the trailer and schedule the drop",
      window: soon ? "Within 48 hours" : "This week",
      reasons: [
        `The campaign has reached the ${s.phase} phase with no trailer in the vault.`,
        "Trailer timing sets the run-up to booking; delay compresses the window.",
      ],
      evidence: [
        { label: "Trailers in vault", value: "0" },
        { label: "Current phase", value: s.phase },
        { label: "Timeline", value: days },
      ],
      unblocks: "The booking window, paid video, and the main press cycle.",
      alternative: "Release a short teaser cut now and hold the full trailer for the booking window.",
    };
  }

  if (s.teamActive < 3) {
    return {
      action: "Grow the street team to at least three active members",
      window: "This week",
      reasons: [
        `Only ${s.teamActive} ${s.teamActive === 1 ? "member is" : "members are"} active, so drops land without amplification.`,
        "Organic amplification is the cheapest reach available before paid spend starts.",
      ],
      evidence: [
        { label: "Active members", value: String(s.teamActive) },
        { label: "Assets ready to push", value: String(s.assetTypes.length) },
        { label: "Timeline", value: days },
      ],
      unblocks: "Amplification on every future drop, at no media cost.",
      alternative: "Run a single campus activation in your strongest city instead of recruiting broadly.",
    };
  }

  if (!s.hasTicketing && s.daysToRelease <= 30 && s.daysToRelease >= 0) {
    return {
      action: "Publish the booking link on the press kit",
      window: "Today",
      reasons: [
        `Release is ${s.daysToRelease} days away and the public kit has no ticketing link.`,
        "Awareness without a booking path has nowhere to convert.",
      ],
      evidence: [
        { label: "Ticketing link", value: "Not published" },
        { label: "Timeline", value: days },
        { label: "Coverage live", value: String(s.coverageCount) },
      ],
      unblocks: "A direct path from the press kit to a sale.",
      alternative: "Link the theatre chain's listing page until the aggregator page is live.",
    };
  }

  if (s.coverageCount === 0) {
    return {
      action: "Publish your first press coverage to the kit",
      window: "This week",
      reasons: [
        "No approved coverage is public, so the kit offers no third-party proof.",
        "Coverage is what turns a visitor into someone who shares.",
      ],
      evidence: [
        { label: "Coverage live", value: "0" },
        { label: "Reviews tracked", value: String(s.reviewCount) },
        { label: "Active members to amplify", value: String(s.teamActive) },
      ],
      unblocks: "Shareable proof for the street team and anyone landing on the kit.",
      alternative: "Turn your strongest review into a quote card and seed it with the street team.",
    };
  }

  const open = s.opportunities.find((o) => !o.done);
  if (open) {
    return {
      action: `Act on the ${open.kind.toLowerCase()}: ${open.title}`,
      window: open.window_ends ? `Before ${open.window_ends}` : "This week",
      reasons: [
        "This window is open now and closes on its own schedule, not yours.",
        "Timed moments reach an audience that has already gathered.",
      ],
      evidence: [
        { label: "Window closes", value: open.window_ends || "Not set" },
        ...(open.reach > 0
          ? [{ label: "Reach you logged", value: open.reach.toLocaleString("en-IN") }]
          : []),
        { label: "Active members", value: String(s.teamActive) },
      ],
      unblocks: "Reach you would otherwise have to buy.",
      alternative: "Skip it if the tone is off-brand — a forced trend costs more credibility than it returns.",
    };
  }

  return {
    action: `Keep the cadence on ${s.title}`,
    window: "Today",
    reasons: [
      "No structural gap is open: assets, team, coverage, and booking are all in place.",
      "At this stage consistency of output matters more than any single new move.",
    ],
    evidence: [
      { label: "Assets published", value: String(s.assetTypes.length) },
      { label: "Coverage live", value: String(s.coverageCount) },
      { label: "Active members", value: String(s.teamActive) },
    ],
    unblocks: "Sustained attention through to release.",
    alternative: "Bring the next phase forward a week to buy slack before release.",
  };
}

/* ───────────────────── risks ───────────────────── */

export type Severity = "High" | "Medium" | "Low";

export interface Risk {
  title: string;
  /** Our judgement of seriousness — labelled as judgement in the UI. */
  severity: Severity;
  /** The real, checkable fact that raised it. */
  evidence: string;
  action: string;
}

export function risks(s: BrainState): Risk[] {
  const out: Risk[] = [];
  const has = (t: string) => s.assetTypes.includes(t);
  const days = Math.max(s.daysToRelease, 0);

  for (const c of s.competitors) {
    out.push({
      title: `${c.title}: ${c.event}`,
      severity: "High",
      evidence: c.event_date ? `You logged this for ${c.event_date}` : "You logged this competitor move",
      action: c.event_date
        ? `Keep your next drop 24 hours clear of ${c.event_date} so you do not split coverage.`
        : "Keep your next drop 24 hours clear of theirs so you do not split coverage.",
    });
  }

  if (!has("Trailer") && s.daysToRelease <= 45 && s.daysToRelease >= 0) {
    out.push({
      title: "No trailer with release inside six weeks",
      severity: "High",
      evidence: `0 trailers in the vault, ${days} days to release`,
      action: "Lock a cut this week, even a shorter one, and protect the booking window.",
    });
  }
  if (s.teamActive < 3) {
    out.push({
      title: "Street team below three active members",
      severity: s.daysToRelease <= 30 ? "High" : "Medium",
      evidence: `${s.teamActive} active ${s.teamActive === 1 ? "member" : "members"}`,
      action: "Recruit until three are active so the next drop lands with amplification.",
    });
  }
  if (s.coverageCount === 0 && s.daysToRelease <= 60) {
    out.push({
      title: "No coverage published",
      severity: "Medium",
      evidence: `0 pieces live, ${days} days to release`,
      action: "Pitch two outlets this week and publish whatever lands to the press kit.",
    });
  }
  if (s.avgRating !== null && s.avgRating < 3) {
    out.push({
      title: "Tracked reviews are averaging below 3 of 5",
      severity: "High",
      evidence: `${s.reviewCount} reviews, averaging ${s.avgRating.toFixed(1)}`,
      action: "Lead with audience reaction over critic quotes, and pull the weakest quotes from the kit.",
    });
  }
  if (!s.hasTicketing && s.daysToRelease <= 21 && s.daysToRelease >= 0) {
    out.push({
      title: "No booking path this close to release",
      severity: "High",
      evidence: `No ticketing link, ${days} days to release`,
      action: "Publish the ticketing link today.",
    });
  }
  if (s.missionsTotal > 0 && s.missionsDone / s.missionsTotal < 0.34 && s.daysToRelease <= 45) {
    out.push({
      title: "Most priorities still open",
      severity: "Medium",
      evidence: `${s.missionsDone} of ${s.missionsTotal} done, ${days} days to release`,
      action: "Clear the two highest-impact open priorities before starting anything new.",
    });
  }

  const rank: Record<Severity, number> = { High: 0, Medium: 1, Low: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 5);
}

/* ───────────────────── budget ───────────────────── */

export interface BudgetMove {
  amount: number;
  from: string;
  to: string;
  rationale: string;
}

/**
 * A suggested reallocation, sized as a share of the real marketing budget.
 * Deliberately carries no ROI figure — we have no spend or performance data,
 * so any number here would be invented.
 */
export function budgetMove(s: BrainState): BudgetMove | null {
  if (s.marketingBudget <= 0) return null;
  const slice = Math.round((s.marketingBudget * 0.08) / 1000) * 1000;
  if (slice <= 0) return null;

  const byPhase: Partial<Record<CampaignPhase, Omit<BudgetMove, "amount">>> = {
    Announcement: { from: "Outdoor", to: "Short-form video", rationale: "Nobody is searching for the film yet — discovery beats reminder at this stage." },
    Poster: { from: "Print", to: "Instagram Reels", rationale: "Poster art travels furthest where it can be reshared, not where it is static." },
    Trailer: { from: "Outdoor", to: "YouTube pre-roll", rationale: "Trailer week is when paid video reaches people already deciding what to watch." },
    Music: { from: "Display", to: "Audio platforms and Reels", rationale: "Songs carry the campaign between trailer and release — spend where they are played." },
    Release: { from: "Brand awareness", to: "Local booking-intent ads", rationale: "In release week, spend that does not end at a booking page is wasted." },
    OTT: { from: "Theatrical outdoor", to: "Platform co-marketing", rationale: "The audience has moved; reach them where the film now lives." },
    Awards: { from: "Consumer ads", to: "Trade and festival placements", rationale: "The audience for this phase is juries and programmers, not ticket buyers." },
  };

  const move = byPhase[s.phase];
  return move ? { amount: slice, ...move } : null;
}

/* ───────────────────── live feed ───────────────────── */

/** Suggestions, each tied to something true about the campaign right now. */
export function liveFeed(s: BrainState): string[] {
  const out: string[] = [];
  const has = (t: string) => s.assetTypes.includes(t);

  if (!has("Stills")) out.push("Upload production stills — outlets reuse low-res frames when you don't supply them.");
  if (s.teamActive > 0 && s.teamActive < 6) out.push(`Give your ${s.teamActive} active ${s.teamActive === 1 ? "member" : "members"} a specific task this week rather than a general ask.`);
  if (s.coverageCount > 0) out.push(`Turn your ${s.coverageCount} published ${s.coverageCount === 1 ? "piece" : "pieces"} into quote cards for the street team.`);
  if (s.reviewCount > 2) out.push("Lead the press kit with your two strongest quotes — visitors rarely read past them.");
  if (s.daysToRelease > 60) out.push("Schedule a behind-the-scenes drop between phases to hold attention through the quiet stretch.");
  if (s.daysToRelease <= 30 && s.daysToRelease >= 0) out.push("Shift to short-form daily output — cadence matters more than production value this close in.");
  if (s.socialCount < 3) out.push("Link every official channel on the press kit so coverage points somewhere you own.");
  if (s.opportunities.some((o) => !o.done)) out.push("An opportunity window you logged is still open.");
  out.push("Schedule a director interview for the week the trailer lands, not after it.");

  return out.slice(0, 6);
}
