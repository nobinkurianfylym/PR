import { NextResponse, type NextRequest } from "next/server";
import { RESERVED, ROOT_DOMAIN } from "@/lib/slug";

/**
 * Wildcard subdomain routing. Every `<slug>.fylym.com` is served by this one
 * deployment: we read the Host header, and if it's a film subdomain we rewrite
 * the request into the existing `/fan/<slug>` route — no per-film deployment,
 * no per-film DNS. Reserved subdomains (www, pr, api, …), multi-level hosts,
 * API/asset/framework paths, and non-fylym hosts all pass through untouched, so
 * the app itself keeps working on pr.fylym.com and the workers.dev domain.
 *
 * Only the Host header decides routing, and it's used solely to pick an
 * internal slug (never to build a redirect or absolute URL), so a spoofed Host
 * can't do more than ask for a film that then 404s — no host-header injection.
 */
const SUFFIX = `.${ROOT_DOMAIN}`;

/**
 * Sibling FYLYM products whose subdomains currently resolve to this worker.
 *
 * Proxied products keep their pretty URL: every path on the host is served
 * from the real app (reverse proxy), so pitch.fylym.com, scheduler.fylym.com
 * and writer.fylym.com all *stay* in the address bar. The reverse proxy keeps
 * the same host toward the browser, so each app's cookies stay scoped to its
 * own fylym.com subdomain. Redirected products (if any) are bounced instead.
 */
const PRODUCT_PROXY: Record<string, string> = {
  "pitch.fylym.com": "https://fylympitch.nobinkurian.workers.dev",
  "scheduler.fylym.com": "https://scheduler-bep.pages.dev",
  "writer.fylym.com": "https://web.nobinkurian.workers.dev",
};
const PRODUCT_REDIRECTS: Record<string, string> = {};

export function middleware(req: NextRequest) {
  const host = ((req.headers.get("host") ?? "").split(":")[0] ?? "").toLowerCase();

  const proxyBase = PRODUCT_PROXY[host];
  if (proxyBase) {
    return NextResponse.rewrite(new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, proxyBase));
  }

  const redirectTo = PRODUCT_REDIRECTS[host];
  if (redirectTo) {
    return NextResponse.redirect(`${redirectTo}${req.nextUrl.pathname}${req.nextUrl.search}`, 302);
  }

  if (!host.endsWith(SUFFIX)) return NextResponse.next();

  const label = host.slice(0, -SUFFIX.length);
  // Apex, reserved, or multi-level (a.b.fylym.com) → serve the app normally.
  if (label === "" || label.includes(".") || RESERVED.has(label)) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fan") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.[a-z0-9]+$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/fan/${label}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

// Runs on every path (only favicon skipped) so a proxied product's own assets
// — /_next/static, /assets, etc. — are forwarded too. For this worker's own
// hosts the middleware just host-checks and passes through, which is cheap.
export const config = {
  matcher: ["/((?!favicon.ico).*)"],
};
