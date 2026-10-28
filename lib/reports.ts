import { assessCall, assessSplit } from "@/lib/learning";
import { seedSplits } from "@/lib/seed";
import type { ChainSnapshot } from "@/lib/chain";
import type { Observation, ResolvedCall, SplitAssessment, CallAssessment } from "@/lib/types";

export function reportCall(
  call: ResolvedCall,
  observations: Observation[],
  memoryOn: boolean,
): CallAssessment {
  return assessCall(call, observations, memoryOn);
}

export function reportSplit(
  id: string,
  observations: Observation[],
  memoryOn: boolean,
  chain: ChainSnapshot,
): SplitAssessment | null {
  const split = seedSplits.find((item) => item.id === id);
  if (!split) return null;
  return assessSplit(split, observations, memoryOn, chain.relation, chain.ok ? chain.blockedReason : chain.blockedReason);
}

export function sourceRows(observations: Observation[]) {
  const groups = new Map<string, Observation[]>();
  for (const observation of observations) {
    if (observation.kind !== "prediction_outcome" || !observation.outcome) continue;
    const key = `${observation.sourceId}::${observation.category}`;
    const list = groups.get(key) ?? [];
    list.push(observation);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([key, list]) => {
    const ordered = [...list].sort((a, b) => a.resolvedAt.localeCompare(b.resolvedAt));
    const hits = ordered.filter((item) => item.outcome === "hit").length;
    let runningHits = 0;
    const spark = ordered.map((item, index) => {
      if (item.outcome === "hit") runningHits += 1;
      return runningHits / (index + 1);
    });
    return {
      key,
      sourceId: ordered[0].sourceId,
      sourceName: ordered[0].sourceName,
      category: ordered[0].category,
      n: ordered.length,
      hits,
      rate: hits / ordered.length,
      spark,
      observations: ordered,
    };
  });
}
