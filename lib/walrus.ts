import { memoryNamespace } from "@/lib/chain";
import { callMemwal } from "@/lib/memwal-bridge";
import { observationToText, parseObservationText } from "@/lib/observation-text";
import { redact } from "@/lib/redact";
import { readState, writeState } from "@/lib/store";
import type { Observation } from "@/lib/types";

export type WalrusStatus = {
  configured: boolean;
  serverUrl: string;
  namespace: string;
  accountId: string | null;
  health: "ok" | "skipped" | "error";
  healthDetail: string | null;
  listed: number | null;
  hasMore: boolean;
  recallSamples: { blobId: string; distance: number; preview: string }[];
  error: string | null;
};

type StatusResult = {
  health: "ok";
  listed: number;
  hasMore: boolean;
  recallSamples: { blobId: string; distance: number; preview: string }[];
};

type RecallRow = { blobId: string; distance: number; text: string };

function credentials() {
  const key = process.env.MEMWAL_KEY?.trim() || process.env.MEMWAL_PRIVATE_KEY?.trim();
  const accountId = process.env.MEMWAL_ACCOUNT_ID?.trim();
  const serverUrl = process.env.MEMWAL_SERVER_URL?.trim() || "https://relayer.memory.walrus.xyz";
  return { key, accountId, serverUrl };
}

export function walrusConfigured(): boolean {
  const { key, accountId } = credentials();
  return Boolean(key && accountId);
}

export async function rememberObservation(observation: Observation): Promise<{
  storage: "walrus" | "local";
  blobId: string | null;
  error: string | null;
}> {
  if (!walrusConfigured()) return { storage: "local", blobId: null, error: null };
  try {
    const stored = await callMemwal<{ blobId: string }>({
      op: "remember",
      text: observationToText(observation),
      idempotencyKey: `rightcall-${observation.id}`,
      timeoutMs: 90_000,
    });
    const state = await readState();
    state.walrus[observation.id] = { blobId: stored.blobId, storedAt: new Date().toISOString() };
    await writeState(state);
    return { storage: "walrus", blobId: stored.blobId, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Walrus remember failed";
    return { storage: "local", blobId: null, error: redact(message) };
  }
}

export async function walrusStatus(): Promise<WalrusStatus> {
  const { serverUrl } = credentials();
  const base: WalrusStatus = {
    configured: walrusConfigured(),
    serverUrl,
    namespace: memoryNamespace(),
    accountId: null,
    health: "skipped",
    healthDetail: null,
    listed: null,
    hasMore: false,
    recallSamples: [],
    error: null,
  };
  if (!base.configured) {
    base.healthDetail = "Set MEMWAL_KEY or MEMWAL_PRIVATE_KEY, plus MEMWAL_ACCOUNT_ID.";
    return base;
  }
  try {
    const status = await callMemwal<StatusResult>({ op: "status" });
    base.health = "ok";
    base.healthDetail = "relayer health ok";
    base.listed = status.listed;
    base.hasMore = status.hasMore;
    base.recallSamples = status.recallSamples;
    return base;
  } catch (error) {
    base.health = "error";
    base.healthDetail = null;
    base.error = redact(error instanceof Error ? error.message : "Walrus status failed");
    return base;
  }
}

export type RecallHit = {
  observation: Observation;
  blobId: string;
  distance: number;
};

export async function recallObservations(query: string, limit = 12): Promise<RecallHit[]> {
  if (!walrusConfigured()) return [];
  const rows = await callMemwal<RecallRow[]>({ op: "recall", query, limit });
  const hits: RecallHit[] = [];
  for (const row of rows) {
    const observation = parseObservationText(row.text);
    if (!observation) continue;
    hits.push({ observation, blobId: row.blobId, distance: row.distance });
  }
  return hits;
}
