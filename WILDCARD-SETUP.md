# Wildcard subdomains — `*.fylym.com`

Every film is served from its own subdomain (`jananayagan.fylym.com`) by this
single Worker deployment. The **application layer is done and deployed**. Two
one-time Cloudflare account actions remain — they can't be scripted from the
repo because they change your account's DNS/routing.

## How it works

```
jananayagan.fylym.com/  ──►  Cloudflare edge (wildcard DNS, proxied)
                        ──►  pr Worker
                        ──►  src/middleware.ts reads Host, extracts "jananayagan"
                        ──►  rewrites internally to /fan/jananayagan
                        ──►  the fan page renders (D1 lookup by slug)
```

Reserved subdomains (`www`, `pr`, `api`, `admin`, …), multi-level hosts, and
`/api`, `/_next`, static, and `/fan/*` paths pass straight through, so the app
itself keeps working on `pr.fylym.com`.

## The two manual steps (Cloudflare dashboard)

`fylym.com` is already on your account (`pr.fylym.com` works), so:

### 1. Wildcard DNS record (proxied)

Dashboard → **fylym.com** → **DNS** → **Add record**

| Field | Value |
|---|---|
| Type | `CNAME` (or `AAAA`) |
| Name | `*` |
| Target | `pr.fylym.com` (CNAME) — or `100::` (AAAA) |
| Proxy status | **Proxied** (orange cloud) — required |

### 2. Worker route for the wildcard

Dashboard → **Workers & Pages** → **pr** → **Settings** → **Domains & Routes**
→ **Add route**

| Field | Value |
|---|---|
| Route | `*.fylym.com/*` |
| Zone | `fylym.com` |

Equivalent `wrangler.jsonc` (apply only *after* step 1 exists, or `deploy`
fails):

```jsonc
"routes": [
  { "pattern": "*.fylym.com/*", "zone_name": "fylym.com" }
]
```

### SSL

Cloudflare's Universal SSL certificate for the zone already covers
`fylym.com` **and** `*.fylym.com` (one wildcard level), so HTTPS works on every
film subdomain automatically — nothing to buy or configure. (Two-level hosts
like `a.b.fylym.com` would need Advanced Certificate Manager; we don't use
those.)

## Verify after setup

```bash
curl -sI https://jananayagan.fylym.com/ | grep -i location   # 200, renders film
curl -sI https://nope.fylym.com/                             # branded 404
curl -s  https://pr.fylym.com/sitemap.xml | grep loc         # lists subdomains
```

## What's already built (in this repo)

- `src/middleware.ts` — Host-based wildcard routing + host-injection safety.
- `src/lib/slug.ts` — slug rules (transliterate, strip emoji/punctuation, spaces
  removed, ≤60 chars, a-z/0-9/-) + reserved list.
- `src/server/slug.ts` — reserved-aware unique slug + `films.slug` UNIQUE index
  (concurrent-duplicate guard).
- `src/app/api/slug-check` — live availability (✅ available / ❌ taken /
  reserved / invalid), auth-gated.
- Create-film wizard — live `https://<slug>.fylym.com` preview, editable slug,
  real-time availability.
- Per-film SEO — canonical + og/twitter to the subdomain, JSON-LD `Movie`,
  unique title/description, `sitemap.ts`, `robots.ts`.
- `src/app/not-found.tsx` — branded 404.

## Future entity types (directors, studios, festivals)

`src/middleware.ts` is the single routing seam. To add e.g.
`directorname.fylym.com`, extend the middleware to look up the label across the
relevant tables and rewrite to that entity's route (`/director/<slug>` etc.) —
no new deployment or DNS, since the wildcard already catches every label.
