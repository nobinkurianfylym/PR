import Link from "next/link";
import {
  Megaphone, FileText, Sparkles, Share2, Star, BarChart3,
  BrainCircuit, FolderLock, Users, Radar, ArrowRight, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/** The publicity pipeline named in the subheading, as a visual spine. */
const PIPELINE: { icon: LucideIcon; label: string }[] = [
  { icon: Megaphone, label: "Announcements" },
  { icon: FileText, label: "Press releases" },
  { icon: Sparkles, label: "Influencers" },
  { icon: Share2, label: "Social media" },
  { icon: Star, label: "Reviews" },
  { icon: BarChart3, label: "Analytics" },
];

const FEATURES: { icon: LucideIcon; name: string; blurb: string }[] = [
  {
    icon: BrainCircuit,
    name: "AI Campaign Brain",
    blurb: "One clear recommendation at a time — what to do next, why, and what it unblocks.",
  },
  {
    icon: FolderLock,
    name: "Press Kits & Asset Vault",
    blurb: "A public press kit per film. Posters, trailers, EPKs — shareable, never the wrong version.",
  },
  {
    icon: Users,
    name: "Street Team & Fans",
    blurb: "Invite your team with one link; grow a fan club that gets updates and premiere draws.",
  },
  {
    icon: Radar,
    name: "Review Radar",
    blurb: "Every review and mention, tracked and turned into shareable quote cards.",
  },
  {
    icon: Share2,
    name: "Coordinated Distribution",
    blurb: "Announcements, coverage, and social — sequenced so each beat lands when it should.",
  },
  {
    icon: BarChart3,
    name: "PR Intelligence",
    blurb: "A single Publicity Readiness view: what's in place, what's at risk, what moves the needle.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Cinematic accent glow — the one splash of colour, kept soft. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-16rem] mx-auto h-[36rem] w-[72rem] max-w-full rounded-full bg-indigo-600/20 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-10rem] top-[10rem] h-[26rem] w-[26rem] rounded-full bg-blue-500/10 blur-[120px]"
      />

      <header className="relative z-10 flex h-16 items-center justify-between px-6 md:px-10">
        <span className="text-sm font-semibold tracking-[0.16em]">PR.FYLYM</span>
        <div className="flex items-center gap-2">
          <Link
            href="/signin"
            className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link href="/signup">
            <Button size="sm" className="bg-indigo-500 text-white hover:bg-indigo-400">
              Start free
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center px-6 pt-16 text-center md:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-indigo-300">
          <Sparkles className="h-3 w-3" strokeWidth={2} />
          The AI publicity command centre
        </span>

        <h1 className="mt-7 max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          The Film Publicity Planning &amp;{" "}
          <span className="bg-gradient-to-r from-indigo-300 to-blue-400 bg-clip-text text-transparent">
            Execution Command Centre
          </span>
        </h1>

        <p className="mt-7 max-w-2xl text-balance text-base leading-relaxed text-muted md:text-lg">
          Plan smarter. Coordinate faster. Execute flawlessly. Manage your entire
          film publicity campaign — from announcements and press releases to
          influencers, social media, reviews and campaign analytics — in one
          intelligent platform.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="lg" className="bg-indigo-500 text-white hover:bg-indigo-400">
              Start a campaign <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Button>
          </Link>
          <Link href="/signin">
            <Button size="lg" variant="outline">
              Sign in
            </Button>
          </Link>
        </div>

        <p className="mt-5 text-xs text-faint">
          Free to start · No credit card · Your first campaign in five minutes
        </p>

        {/* Pipeline spine */}
        <div className="mt-20 w-full max-w-4xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-faint">
            One platform, the whole campaign
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-4">
            {PIPELINE.map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-3.5 py-2.5">
                  <Icon className="h-4 w-4 text-indigo-300" strokeWidth={1.5} />
                  <span className="text-[13px] font-medium">{label}</span>
                </div>
                {i < PIPELINE.length - 1 && (
                  <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-faint sm:block" strokeWidth={1.5} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Feature grid */}
        <div className="mt-24 grid w-full max-w-5xl grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, name, blurb }) => (
            <div
              key={name}
              className="group rounded-2xl border border-border bg-surface/70 p-6 transition-colors hover:border-indigo-500/40"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/25 bg-indigo-500/10 text-indigo-300 transition-colors group-hover:bg-indigo-500/15">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <p className="mt-4 text-[15px] font-medium">{name}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{blurb}</p>
            </div>
          ))}
        </div>

        {/* Closing CTA */}
        <div className="mt-24 w-full max-w-5xl overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 to-transparent p-10 text-center md:p-14">
          <h2 className="mx-auto max-w-2xl text-balance text-2xl font-semibold tracking-tight md:text-4xl">
            Run your next release like a studio.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-balance text-sm text-muted md:text-base">
            Every asset, every review, every fan — coordinated from one calm,
            intelligent command centre.
          </p>
          <Link href="/signup" className="mt-8 inline-block">
            <Button size="lg" className="bg-indigo-500 text-white hover:bg-indigo-400">
              Start a campaign <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Button>
          </Link>
        </div>
      </main>

      <footer className="relative z-10 mt-24 border-t border-border px-6 py-8 text-center text-xs text-faint">
        FYLYM Studio — Writer · Scheduler · Pitch · PR
      </footer>
    </div>
  );
}
