import Link from "next/link";

/**
 * Branded 404 — shown for an unknown film subdomain or any missing route.
 * Deliberately self-contained (dark, on-brand) rather than the framework
 * default.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0b] px-6 text-center text-[#f5f5f5]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#b78a34]">PR.FYLYM</p>
      <h1 className="mt-4 text-6xl font-extrabold tracking-tight">404</h1>
      <p className="mt-3 max-w-md text-sm text-white/60">
        This page isn&rsquo;t here. The film may have moved, or the address is
        mistyped.
      </p>
      <Link
        href="https://pr.fylym.com"
        className="mt-8 inline-flex items-center rounded-full bg-[#b78a34] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c9a24e]"
      >
        Go to PR.FYLYM
      </Link>
    </div>
  );
}
