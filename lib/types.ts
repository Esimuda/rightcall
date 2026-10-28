export const SCHEMA = "rightcall.v1" as const;

export type Provenance = "seed" | "user";
export type ObservationKind = "prediction_outcome" | "odds_disagreement";
export type CallOutcome = "hit" | "miss";
export type DisagreementOutcome = "book_correct" | "chain_correct" | "push";
export type GapSide = "book_richer" | "chain_richer" | "even";
export type Recommendation = "Follow" | "Fade" | "Pass";
export type SplitJudgment =
  | "Lean chain"
  | "Lean book"
  | "No edge"
  | "Thin sample"
  | "Blocked";
export type SpotRelation = "under" | "over" | "flat" | "unknown";

export type Observation = {
  id: string;
  schema: typeof SCHEMA;
  kind: ObservationKind;
  sourceId: string;
  sourceName: string;
  category: string;
  event: string;
  conditions: string[];
  pick: string | null;
  statedConfidence: number | null;
  outcome: CallOutcome | null;
  bookProbability: number | null;
  chainProbability: number | null;
  gapPp: number | null;
  gapSide: GapSide | null;
  disagreementOutcome: DisagreementOutcome | null;
  lockedAt: string;
  resolvedAt: string;
  lockedCheckpoint: number | null;
  resolvedCheckpoint: number | null;
  provenance: Provenance;
  note: string;
};

export type OpenCall = {
  id: string;
  sourceId: string;
  sourceName: string;
  category: string;
  event: string;
  pick: string;
  statedConfidence: number;
  conditions: string[];
  focusTags: string[];
  lockedAt: string;
  startsAt: string;
  lockedCheckpoint: number | null;
  provenance: Provenance;
};

export type ResolvedCall = OpenCall & {
  status: "open" | "resolved";
  outcome: CallOutcome | null;
  resolvedAt: string | null;
};

export type OpenSplit = {
  id: string;
  event: string;
  detail: string;
  bookProbability: number;
  chainProbability: number;
  bookSource: "seed";
  chainSource: "seed";
  lockedAt: string;
};

export type SourceProfile = {
  id: string;
  name: string;
  desk: string;
};

export type MemoryRef = {
  id: string;
  title: string;
  detail: string;
  meta: string;
};

export type Uncertainty = {
  low: number;
  high: number;
  n: number;
  hits: number;
  width: number;
  label: "Thin" | "Wide" | "Usable";
};

export type CallAssessment = {
  call: ResolvedCall;
  memoryOn: boolean;
  stated: number;
  adjusted: number | null;
  before: Recommendation;
  after: Recommendation | null;
  changed: boolean;
  used: Observation[];
  heldOut: Observation[];
  uncertainty: Uncertainty | null;
  paragraphs: string[];
};

export type SplitAssessment = {
  split: OpenSplit;
  memoryOn: boolean;
  gapPp: number;
  gapSide: GapSide;
  relation: SpotRelation;
  cohortLabel: string;
  used: Observation[];
  chainWins: number;
  decided: number;
  rate: number | null;
  judgment: SplitJudgment | null;
  paragraphs: string[];
  uncertainty: Uncertainty | null;
};
