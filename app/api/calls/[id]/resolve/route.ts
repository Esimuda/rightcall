import { readChain } from "@/lib/chain";
import { observationToText } from "@/lib/observation-text";
import { findCall, isSlug, readState, writeState } from "@/lib/store";
import { SCHEMA, type Observation } from "@/lib/types";
import { rememberObservation } from "@/lib/walrus";
import { pct } from "@/lib/utils";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isSlug(id)) return NextResponse.json({ error: "Unknown call." }, { status: 404 });
  const call = await findCall(id);
  if (!call) return NextResponse.json({ error: "Unknown call." }, { status: 404 });
  if (call.status === "resolved") {
    return NextResponse.json({ error: "This call already has an outcome." }, { status: 409 });
  }
  const body = (await request.json().catch(() => null)) as { outcome?: unknown } | null;
  const outcome = body?.outcome === "hit" || body?.outcome === "miss" ? body.outcome : null;
  if (!outcome) return NextResponse.json({ error: "Outcome must be hit or miss." }, { status: 400 });

  const chain = await readChain();
  const resolvedAt = new Date().toISOString();
  const observationId = `obs-${id}`.slice(0, 80);
  const observation: Observation = {
    id: observationId,
    schema: SCHEMA,
    kind: "prediction_outcome",
    sourceId: call.sourceId,
    sourceName: call.sourceName,
    category: call.category,
    event: call.event,
    conditions: call.conditions,
    pick: call.pick,
    statedConfidence: call.statedConfidence,
    outcome,
    bookProbability: null,
    chainProbability: null,
    gapPp: null,
    gapSide: null,
    disagreementOutcome: null,
    lockedAt: call.lockedAt,
    resolvedAt,
    lockedCheckpoint: call.lockedCheckpoint,
    resolvedCheckpoint: chain.ok ? chain.checkpoint : null,
    provenance: call.provenance,
    note: `${call.pick} was locked at ${pct(call.statedConfidence)} before ${call.event}. Outcome: ${outcome}. Calibration compares that confidence with ${outcome === "hit" ? "1" : "0"}. This records the call, not a label about ${call.sourceName}.`,
  };

  const state = await readState();
  if (state.resolutions[id]) {
    return NextResponse.json({ error: "This call already has an outcome." }, { status: 409 });
  }
  state.resolutions[id] = {
    outcome,
    resolvedAt,
    resolvedCheckpoint: observation.resolvedCheckpoint,
    observationId,
  };
  state.observations.push(observation);
  await writeState(state);

  const stored = await rememberObservation(observation);
  return NextResponse.json({
    observationId,
    storage: stored.storage,
    blobId: stored.blobId,
    walrusError: stored.error,
    preview: observationToText(observation).slice(0, 280),
  });
}
