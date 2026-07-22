"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  CampaignPhase,
  Mission,
  PhaseStatus,
  Review,
  TeamMember,
} from "@/types";

/** The /api/overview payload — one fetch powers every signed-in page. */
export interface Overview {
  user: { id: string; name: string; email: string };
  film:
    | {
        id: string;
        title: string;
        genre: string;
        language: string;
        release_date: string;
        healthScore: number;
        phase: CampaignPhase;
        daysToRelease: number;
        /** Public press-kit slug and whether that page is live. */
        slug: string;
        published: number;
      }
    | null;
  /** Every campaign the producer owns, for the switcher. */
  films: { id: string; title: string }[];
  phases: { phase: CampaignPhase; date: string; summary: string; status: PhaseStatus; id?: string }[];
  missions: Mission[];
  team: TeamMember[];
  reviews: Review[];
  ai: { today: string; nextAction: string; summary: string };
}

interface Ctx {
  data: Overview | null;
  loading: boolean;
  unauthorized: boolean;
  refresh: () => Promise<void>;
}

const OverviewContext = createContext<Ctx | null>(null);

export function OverviewProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/overview", { cache: "no-store" });
    if (res.status === 401) {
      setUnauthorized(true);
      setData(null);
    } else if (res.ok) {
      setUnauthorized(false);
      setData((await res.json()) as Overview);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <OverviewContext.Provider value={{ data, loading, unauthorized, refresh }}>
      {children}
    </OverviewContext.Provider>
  );
}

export function useOverview(): Ctx {
  const ctx = useContext(OverviewContext);
  if (!ctx) throw new Error("useOverview must be used inside OverviewProvider");
  return ctx;
}

/* ── API actions ── */

async function post(url: string, body?: unknown, method = "POST"): Promise<Response> {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

export const api = {
  signIn: (email: string, password: string) => post("/api/auth/signin", { email, password }),
  signUp: (name: string, email: string, password: string) =>
    post("/api/auth/signup", { name, email, password }),
  signOut: () => post("/api/auth/signout"),
  createFilm: (film: Record<string, unknown>) => post("/api/films", film),
  selectFilm: (filmId: string) => post("/api/films/select", { filmId }),
  setPublished: (published: boolean) => post("/api/films/publish", { published }),
  toggleMission: (id: string, done: boolean) => post(`/api/missions/${id}`, { done }, "PATCH"),
  invite: (name: string, role: string) => post("/api/team", { name, role }),
  addReview: (review: { quote: string; publication: string; critic: string; rating: number }) =>
    post("/api/reviews", review),
};

export function formatDate(iso: string): string {
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
