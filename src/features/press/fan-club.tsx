import { Gift } from "lucide-react";
import { FanJoinBar } from "./fan-join-bar";
import { FanLeaderboard } from "./fan-leaderboard";
import { FanBoard } from "./fan-board";

/**
 * The Fan Club — the core of the fan page, gathered into one cohesive block
 * instead of a run of loose sections. A single espresso panel: a headline band
 * with the join call-to-action, then the prizes, the leaderboard, and the fan
 * wall as consistent inner panels sharing one visual language.
 */
export function FanClub({
  slug,
  film,
  rewards,
  whatsapp,
  telegram,
}: {
  slug: string;
  film: string;
  rewards: { title: string; detail: string }[];
  whatsapp?: string;
  telegram?: string;
}) {
  return (
    <section
      id="fan-club"
      className="mt-16 scroll-mt-20 overflow-hidden rounded-3xl border border-gold/25 bg-espresso text-[#f3ecdd] shadow-2xl shadow-black/20"
    >
      {/* Headline band + join */}
      <div className="border-b border-white/10 bg-gradient-to-br from-gold/20 via-gold/[0.07] to-transparent px-6 py-12 text-center sm:px-10 sm:py-14">
        <p className="text-[12px] font-bold uppercase tracking-[0.28em] text-gold-soft">Fan Club</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold uppercase leading-[1.03] tracking-tight md:text-5xl">
          Be part of the story
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#efe7d6]/70">
          Join free, earn points every time you share, climb the leaderboard, and win real prizes.
        </p>
        <div className="mt-7 flex flex-col items-center gap-2">
          <FanJoinBar slug={slug} film={film} />
        </div>
      </div>

      {/* Body — prizes, leaderboard, wall */}
      <div className="space-y-12 px-5 py-10 sm:px-10 sm:py-12">
        {rewards.length > 0 && (
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-soft">
              <Gift className="h-3.5 w-3.5" strokeWidth={1.5} /> What top fans win
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rewards.map((r, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-semibold text-[#f3ecdd]">{r.title}</p>
                  {r.detail && <p className="mt-1 text-sm text-[#efe7d6]/60">{r.detail}</p>}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/40">
              Climb the leaderboard and verify your email to be eligible.
            </p>
          </div>
        )}

        <FanLeaderboard slug={slug} />

        <FanBoard slug={slug} whatsapp={whatsapp} telegram={telegram} />
      </div>
    </section>
  );
}
