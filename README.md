# PR.FYLYM

**The AI Publicity Operating System for Films** — the fourth product in the FYLYM ecosystem, alongside Writer (screenwriting), Scheduler (production scheduling), and Pitch (film funding).

This is the MVP: a frontend-only Next.js app running entirely on mock data. Every page reads through one typed data layer (`src/lib/mock.ts`) — when the backend arrives (PostgreSQL/Supabase, Cloudflare R2, OpenAI, WhatsApp), that file becomes the API client and the components don't move.

## Quickstart

```bash
pnpm install
pnpm dev        # http://localhost:3002
```

`pnpm build` · `pnpm lint` · `pnpm typecheck`

## What's inside

- **Landing** — the 60-second pitch and a single CTA.
- **Sign in / up** — mock auth (persisted Zustand store; swaps for Supabase later).
- **Dashboard** — Publicity Health Score™, today's priorities, campaign timeline, activity, latest reviews, upcoming milestones.
- **Create Film** — a four-step wizard (React Hook Form + Zod) ending in *Generate Campaign*.
- **Campaign** — the publicity spine: Announcement → Poster → Trailer → Music → Release → OTT → Awards.
- **Street Team** — members, roles, status, contribution.
- **Asset Vault** — posters, trailers, EPK, stills, logo.
- **Review Wall** — press reviews with one-click quote-card generation.
- **Campaign Brain** — persistent AI sidebar (static recommendations for now).

## Architecture

- `src/app` — App Router routes only; `(auth)` and `(app)` route groups.
- `src/components` — design-system primitives (`ui/`) and the app shell (`layout/`).
- `src/features` — feature-owned components (dashboard, campaign, films, reviews).
- `src/lib/mock.ts` — the single data seam between UI and (future) APIs.
- `src/mock/*.json` — mock data, one file per future API resource.
- `src/types` — the domain model.

Dark-first, monochrome, no gradients. Stack: Next.js 15, React 19, TypeScript (strict), Tailwind, shadcn-style primitives, Zustand, React Hook Form, Zod, Framer Motion, Lucide.
