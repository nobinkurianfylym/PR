/**
 * The model layer.
 *
 * Division of labour, and it matters:
 *
 *   The DECISION and every NUMBER are computed deterministically in
 *   strategist.ts. The model never chooses what to do and never supplies a
 *   figure. It is given the decision and the real facts, and asked only to
 *   write the reasoning — in the language of this specific film, genre,
 *   language, and market.
 *
 * That keeps the truth rule intact while making the advice genuinely
 * situational rather than templated. Output is validated before it is shown:
 * anything containing a percentage, a multiplier, or forecast language is
 * rejected outright and the deterministic text is used instead. A model that
 * misbehaves degrades to rules; it can never put an invented metric on screen.
 */

export interface ReasoningInput {
  title: string;
  genre: string;
  language: string;
  phase: string;
  daysToRelease: number;
  /** The decision, already made by the deterministic strategist. */
  action: string;
  /** Real counts the model may refer to, and nothing else. */
  facts: { label: string; value: string }[];
  fallback: { reasons: string[]; unblocks: string; alternative: string };
}

export interface Reasoning {
  reasons: string[];
  unblocks: string;
  alternative: string;
  /** Shown in the UI so a producer always knows what wrote this. */
  source: "model" | "rules";
  /** Why we fell back, when we did. Diagnostic only. */
  note?: string;
}

/**
 * Forecast-shaped language we refuse to display, whatever the model returns.
 * Covers symbols and the spelled-out forms — a model that writes "12 percent"
 * or "we estimate" is making the same claim as one that writes "12%".
 */
const FORBIDDEN = new RegExp(
  [
    // Quantified claims — the actual danger.
    "%", "\\bper ?cents?\\b", "\\bROI\\b", "\\d\\s*×", "\\b\\d+\\s*x\\b",
    "\\bup to \\d", "\\d+\\s*(?:points|percentage)",
    // Words that assert measurement or certainty we do not have.
    "\\bestimat\\w*", "\\bproject(?:ed|ion|ions)\\b", "\\bforecast\\w*",
    "\\bpredict\\w*", "\\bguarantee\\w*",
  ].join("|"),
  "i",
);
// Qualitative judgement ("this will build press interest") is deliberately
// allowed — the truth rule bans invented data, not a CMO's reasoning.

function clean(text: unknown, max: number): string | null {
  if (typeof text !== "string") return null;
  const t = text.trim();
  if (t.length < 12 || t.length > max) return null;
  if (FORBIDDEN.test(t)) return null;
  return t;
}

export async function reasonAboutCall(
  input: ReasoningInput,
  apiKey: string | undefined,
): Promise<Reasoning> {
  const rules = (note: string): Reasoning => ({ ...input.fallback, source: "rules", note });
  if (!apiKey) return rules("no-key");

  const system = [
    "You are the Chief Marketing Officer of a film studio, advising a producer.",
    "A decision has already been made by the system. Your job is ONLY to explain it well.",
    "",
    "ABSOLUTE RULES:",
    "1. Never invent numbers, percentages, statistics, ROI, or reach figures. None. Ever.",
    "2. The only numbers you may write are ones that appear verbatim in the FACTS given to you.",
    "3. Never use these words: estimated, projected, forecast, predict, guarantee, ROI, percent, %.",
    "4. Qualitative reasoning is welcome — say why something matters, not how much it will return.",
    "5. Be specific to this film's genre, language, and market. Avoid generic marketing filler.",
    "6. Write plainly and calmly. No hype, no exclamation marks, no buzzwords.",
    "",
    'Reply as JSON: {"reasons": [exactly two short sentences, as separate array items], "unblocks": "one sentence on what this makes possible", "alternative": "one sentence describing a different approach a good CMO might take instead"}',
  ].join("\n");

  const user = JSON.stringify({
    film: input.title,
    genre: input.genre,
    language: input.language,
    phase: input.phase,
    daysToRelease: input.daysToRelease,
    decidedAction: input.action,
    facts: input.facts,
  });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return rules(`http-${res.status}`);

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return rules("empty");

    const parsed = JSON.parse(raw) as Partial<{ reasons: unknown; unblocks: unknown; alternative: unknown }>;

    // Models sometimes return one long string instead of an array; split it
    // rather than throwing away otherwise-valid reasoning.
    const rawReasons: unknown[] = Array.isArray(parsed.reasons)
      ? parsed.reasons
      : typeof parsed.reasons === "string"
        ? parsed.reasons.split(/(?<=\.)\s+/)
        : [];

    const reasons = rawReasons
      .map((r) => clean(r, 400))
      .filter((r): r is string => r !== null)
      .slice(0, 3);
    const unblocks = clean(parsed.unblocks, 400);
    const alternative = clean(parsed.alternative, 400);

    // One well-argued reason beats discarding the whole response.
    if (reasons.length < 1 || !unblocks || !alternative) {
      const why = [
        `reasons:${reasons.length}/${rawReasons.length}`,
        unblocks ? "" : "unblocks-failed",
        alternative ? "" : "alternative-failed",
      ].filter(Boolean).join(" ");
      return rules(`rejected(${why})`);
    }

    return { reasons, unblocks, alternative, source: "model" };
  } catch (e) {
    return rules(e instanceof Error ? e.name : "error");
  }
}
