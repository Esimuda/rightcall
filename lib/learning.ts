import type {
  CallAssessment,
  CallOutcome,
  Observation,
  OpenCall,
  OpenSplit,
  Recommendation,
  SplitAssessment,
  SplitJudgment,
  SpotRelation,
  Uncertainty,
} from "@/lib/types";
import { pct } from "@/lib/utils";

/** Pseudocounts. A short book cannot fully replace the stated confidence. */
export const PRIOR_STRENGTH = 3;
/** Below this, memory may withhold a follow or fade. It may not invent one. */
export const MIN_N_TO_MOVE = 4;
export const FOLLOW_AT = 0.6;
export const FADE_AT = 0.42;
export const SPLIT_EDGE = 0.75;
export const SPLIT_MIN = 5;
/**
 * These expiries are one and five minutes, so the reference sits on the spot.
 * A two-dollar band is flat. Anything wider picks the under or over cohort.
 */
export const FLAT_USD = 2;

export function wilson(hits: number, n: number, z = 1.96): Uncertainty {
  if (n <= 0) {
    return { low: 0, high: 1, n: 0, hits: 0, width: 1, label: "Thin" };
  }
  const p = hits / n;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denominator;
  const low = clamp01(center - margin);
  const high = clamp01(center + margin);
  const width = high - low;
  const label = n < MIN_N_TO_MOVE ? "Thin" : width > 0.35 ? "Wide" : "Usable";
  return { low, high, n, hits, width, label };
}

export function recommendationFrom(probability: number, sample: number | null): Recommendation {
  if (sample != null && sample < MIN_N_TO_MOVE) return "Pass";
  if (probability >= FOLLOW_AT) return "Follow";
  if (probability <= FADE_AT) return "Fade";
  return "Pass";
}

export function statedRecommendation(probability: number): Recommendation {
  if (probability >= FOLLOW_AT) return "Follow";
  if (probability <= FADE_AT) return "Fade";
  return "Pass";
}

export function selectPredictionMemories(call: OpenCall, observations: Observation[]) {
  const pool = observations.filter(
    (observation) =>
      observation.kind === "prediction_outcome" &&
      observation.sourceId === call.sourceId &&
      observation.category === call.category &&
      observation.outcome != null,
  );
  const used = pool.filter((observation) =>
    call.focusTags.every((tag) => observation.conditions.includes(tag)),
  );
  const heldOut = pool.filter((observation) => !used.includes(observation));
  return { used, heldOut, fellBack: false as const };
}

export function assessCall(
  call: OpenCall & {
    status?: "open" | "resolved";
    outcome?: CallOutcome | null;
    resolvedAt?: string | null;
  },
  observations: Observation[],
  memoryOn: boolean,
): CallAssessment {
  const { used, heldOut } = selectPredictionMemories(call, observations);
  const hits = used.filter((observation) => observation.outcome === "hit").length;
  const n = used.length;
  const uncertainty = n > 0 ? wilson(hits, n) : null;
  const before = statedRecommendation(call.statedConfidence);
  const empirical = n > 0 ? hits / n : null;
  const weight = n > 0 ? n / (n + PRIOR_STRENGTH) : 0;
  const adjusted =
    empirical == null ? null : (1 - weight) * call.statedConfidence + weight * empirical;
  const after =
    adjusted == null ? null : recommendationFrom(adjusted, n);
  const changed = memoryOn && after != null && after !== before;

  const paragraphs = memoryOn
    ? memoryOnCopy({
        call,
        before,
        after,
        adjusted,
        hits,
        n,
        heldOut: heldOut.length,
        uncertainty,
      })
    : [
        `Memory is off. The desk uses the stated ${pct(call.statedConfidence)} and does not consult stored outcomes.`,
        `The recommendation stays ${before}. Comparable ${call.category} calls are still on the timeline if you turn memory on.`,
      ];

  return {
    call: {
      ...call,
      status: call.status ?? "open",
      outcome: call.outcome ?? null,
      resolvedAt: call.resolvedAt ?? null,
    },
    memoryOn,
    stated: call.statedConfidence,
    adjusted: memoryOn ? adjusted : null,
    before,
    after: memoryOn ? after : null,
    changed,
    used: memoryOn ? used : [],
    heldOut: memoryOn ? heldOut : [],
    uncertainty: memoryOn ? uncertainty : null,
    paragraphs,
  };
}

function memoryOnCopy(input: {
  call: OpenCall;
  before: Recommendation;
  after: Recommendation | null;
  adjusted: number | null;
  hits: number;
  n: number;
  heldOut: number;
  uncertainty: Uncertainty | null;
}): string[] {
  if (input.n === 0 || input.adjusted == null || input.after == null) {
    return [
      "No comparable stored outcome matches this source, category, and condition.",
      "The stated confidence stands. There is nothing yet to revise.",
    ];
  }
  const moved =
    input.after === input.before
      ? `The call stays ${input.after}. The point estimate moves from ${pct(input.call.statedConfidence)} to ${pct(input.adjusted)}.`
      : `The call moves from ${input.before} to ${input.after}. Stated ${pct(input.call.statedConfidence)} becomes ${pct(input.adjusted)} after ${input.hits} of ${input.n} similar outcomes.`;
  const held =
    input.heldOut > 0
      ? `${input.heldOut} other ${input.call.category} ${input.heldOut === 1 ? "result was" : "results were"} held out. Different conditions stay out of this adjustment.`
      : "Every stored result in this category matched the condition on the new call.";
  const band = input.uncertainty
    ? input.uncertainty.label === "Thin"
      ? `Only ${input.n} comparable results. Memory will not promote this to a follow or a fade.`
      : `The ${input.uncertainty.label.toLowerCase()} band on those ${input.n} runs from ${pct(input.uncertainty.low)} to ${pct(input.uncertainty.high)}.`
    : "";
  return [moved, held, band].filter(Boolean);
}

export function spotRelation(spot: number | null, reference: number | null): SpotRelation {
  if (spot == null || reference == null) return "unknown";
  const delta = spot - reference;
  if (Math.abs(delta) <= FLAT_USD) return "flat";
  return delta < 0 ? "under" : "over";
}

export function gapOf(book: number, chain: number) {
  const pp = Math.round((book - chain) * 100);
  const side = pp > 0 ? "book_richer" : pp < 0 ? "chain_richer" : "even";
  return { pp, side, abs: Math.abs(pp) } as const;
}

export function assessSplit(
  split: OpenSplit,
  observations: Observation[],
  memoryOn: boolean,
  relation: SpotRelation,
  blockedReason: string | null,
): SplitAssessment {
  const book = observations.filter(
    (observation) =>
      observation.kind === "odds_disagreement" &&
      observation.category === "BTC expiry" &&
      observation.disagreementOutcome != null &&
      observation.disagreementOutcome !== "push",
  );
  const cohortTag = relation === "under" ? "spot-under" : relation === "over" ? "spot-over" : null;
  const filtered = cohortTag
    ? book.filter((observation) => observation.conditions.includes(cohortTag))
    : book;
  const used = filtered.length >= SPLIT_MIN ? filtered : book;
  const cohortLabel =
    filtered.length >= SPLIT_MIN && cohortTag
      ? relation === "under"
        ? "spot under the reference"
        : "spot over the reference"
      : relation === "unknown"
        ? "full disagreement book, chain spot unread"
        : relation === "flat"
          ? "full disagreement book, spot near the reference"
          : "full disagreement book, cohort was thin";

  const decided = used.length;
  const chainWins = used.filter((observation) => observation.disagreementOutcome === "chain_correct").length;
  const rate = decided > 0 ? chainWins / decided : null;
  const uncertainty = decided > 0 ? wilson(chainWins, decided) : null;
  const { pp, side } = gapOf(split.bookProbability, split.chainProbability);

  let judgment: SplitJudgment | null = null;
  if (memoryOn) {
    if (blockedReason) judgment = "Blocked";
    else if (rate == null || decided < SPLIT_MIN) judgment = "Thin sample";
    else if (rate >= SPLIT_EDGE) judgment = "Lean chain";
    else if (rate <= 1 - SPLIT_EDGE) judgment = "Lean book";
    else judgment = "No edge";
  }

  const paragraphs: string[] = [];
  paragraphs.push(
    `Seeded book ${pct(split.bookProbability)} versus seeded chain quote ${pct(split.chainProbability)}. Gap ${pp > 0 ? "+" : ""}${pp} pp, ${side === "book_richer" ? "book richer" : side === "chain_richer" ? "chain richer" : "even"}.`,
  );
  if (!memoryOn) {
    paragraphs.push("Historical judgment is off. The gap stays on the tape.");
  } else if (blockedReason) {
    paragraphs.push(blockedReason);
    if (rate != null) {
      paragraphs.push(
        `Stored disagreements in this cohort went to the chain ${chainWins} of ${decided} times. The gate blocks acting on that lean.`,
      );
    }
  } else if (rate != null && judgment) {
    paragraphs.push(
      `${cohortLabel[0].toUpperCase()}${cohortLabel.slice(1)}: the chain side was right ${chainWins} of ${decided}. Judgment: ${judgment}.`,
    );
    if (uncertainty) {
      paragraphs.push(
        `That rate sits in a ${uncertainty.label.toLowerCase()} band, ${pct(uncertainty.low)} to ${pct(uncertainty.high)}.`,
      );
    }
  }

  return {
    split,
    memoryOn,
    gapPp: pp,
    gapSide: side,
    relation,
    cohortLabel,
    used: memoryOn ? used : [],
    chainWins,
    decided,
    rate: memoryOn ? rate : null,
    judgment,
    paragraphs,
    uncertainty: memoryOn ? uncertainty : null,
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
