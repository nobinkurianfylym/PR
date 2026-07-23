/**
 * The campaign checklist template — the master list of everything a film's
 * publicity push runs through, in the order it should appear on the page. It
 * lives in code (not the database) so it is the same for every film; only each
 * item's ticked/uploaded state is stored per film. An item's stable key is
 * `<category>.<item>`; never renumber ids, or a film would lose its state.
 */
export interface ChecklistItem {
  id: string;
  label: string;
}

export interface ChecklistCategory {
  id: string;
  label: string;
  items: ChecklistItem[];
}

export const CHECKLIST: ChecklistCategory[] = [
  {
    id: "campaign",
    label: "Campaign",
    items: [
      { id: "release-date", label: "Release date locked" },
      { id: "strategy", label: "Campaign strategy brief" },
      { id: "budget", label: "Budget & spend tracker" },
      { id: "calendar", label: "Key dates calendar" },
      { id: "team", label: "Team & roles assigned" },
    ],
  },
  {
    id: "press-kit",
    label: "Press Kit",
    items: [
      { id: "synopsis", label: "Synopsis & logline" },
      { id: "director-note", label: "Director's statement" },
      { id: "bios", label: "Cast & crew bios" },
      { id: "posters", label: "High-res posters" },
      { id: "stills", label: "Stills & BTS photos" },
      { id: "trailer", label: "Trailer / teaser" },
      { id: "epk", label: "Production notes (EPK)" },
      { id: "logo", label: "Logo & brand assets" },
    ],
  },
  {
    id: "fans",
    label: "Fans",
    items: [
      { id: "fan-club", label: "Fan club live" },
      { id: "community", label: "WhatsApp / Telegram community" },
      { id: "contest", label: "Contest / giveaway plan" },
      { id: "premiere-draw", label: "Premiere ticket draw" },
      { id: "leaderboard", label: "Fan leaderboard active" },
    ],
  },
  {
    id: "pr",
    label: "PR",
    items: [
      { id: "press-release", label: "Press release drafted" },
      { id: "media-list", label: "Media list built" },
      { id: "outreach", label: "Journalist outreach" },
      { id: "interviews", label: "Interviews scheduled" },
      { id: "press-conf", label: "Press conference plan" },
      { id: "embargo", label: "Embargo dates set" },
    ],
  },
  {
    id: "social",
    label: "Social Media",
    items: [
      { id: "calendar", label: "Content calendar" },
      { id: "first-look", label: "First-look poster post" },
      { id: "teaser", label: "Teaser drop" },
      { id: "trailer-launch", label: "Trailer launch" },
      { id: "hashtag", label: "Hashtag strategy" },
      { id: "influencers", label: "Influencer outreach" },
      { id: "paid-ads", label: "Paid ad plan" },
    ],
  },
  {
    id: "reviews",
    label: "Reviews",
    items: [
      { id: "preview", label: "Preview / press screening" },
      { id: "screeners", label: "Critic screener links" },
      { id: "embargo", label: "Review embargo set" },
      { id: "roundup", label: "Review roundup collected" },
      { id: "aggregators", label: "IMDb / Letterboxd pages live" },
    ],
  },
  {
    id: "events",
    label: "Events",
    items: [
      { id: "audio-launch", label: "Audio / music launch" },
      { id: "trailer-event", label: "Trailer launch event" },
      { id: "press-meet", label: "Press meet" },
      { id: "premiere", label: "Premiere" },
      { id: "promo-tour", label: "Promotional city tour" },
      { id: "fan-meet", label: "Fan meet" },
    ],
  },
  {
    id: "distribution",
    label: "Distribution",
    items: [
      { id: "theatrical", label: "Theatrical release plan" },
      { id: "ott", label: "OTT / streaming deal" },
      { id: "satellite", label: "Satellite / TV rights" },
      { id: "international", label: "International / festival" },
      { id: "showtimes", label: "Showtimes & ticketing links" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    items: [
      { id: "trailer-views", label: "Trailer views tracked" },
      { id: "social-reach", label: "Social reach report" },
      { id: "kit-traffic", label: "Press kit / site traffic" },
      { id: "sentiment", label: "Sentiment tracking" },
      { id: "box-office", label: "Box office tracking" },
    ],
  },
  {
    id: "ai",
    label: "AI",
    items: [
      { id: "brain-plan", label: "Campaign Brain plan reviewed" },
      { id: "captions", label: "AI captions generated" },
      { id: "quote-cards", label: "Quote cards generated" },
      { id: "kit-summary", label: "Auto press-kit summary" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    items: [
      { id: "contracts", label: "Contracts & clearances" },
      { id: "licenses", label: "Music / footage licenses" },
      { id: "certification", label: "Certification (censor board)" },
      { id: "invoices", label: "Invoices & payments" },
      { id: "access", label: "Access & permissions" },
    ],
  },
];

/** Every valid item key — used to reject writes for keys not in the template. */
export const CHECKLIST_KEYS = new Set(
  CHECKLIST.flatMap((c) => c.items.map((i) => `${c.id}.${i.id}`)),
);

export const CHECKLIST_TOTAL = CHECKLIST_KEYS.size;
