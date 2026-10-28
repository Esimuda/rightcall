import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { seedCalls, seedObservations } from "@/lib/seed";
import type { CallOutcome, Observation, OpenCall, ResolvedCall } from "@/lib/types";

export type RuntimeState = {
  calls: OpenCall[];
  observations: Observation[];
  resolutions: Record<
    string,
    {
      outcome: CallOutcome;
      resolvedAt: string;
      resolvedCheckpoint: number | null;
      observationId: string;
    }
  >;
  walrus: Record<string, { blobId: string; storedAt: string }>;
};

const EMPTY: RuntimeState = {
  calls: [],
  observations: [],
  resolutions: {},
  walrus: {},
};

const filePath = path.join(process.cwd(), "data", "runtime", "state.json");

export async function readState(): Promise<RuntimeState> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<RuntimeState>;
    return {
      calls: parsed.calls ?? [],
      observations: parsed.observations ?? [],
      resolutions: parsed.resolutions ?? {},
      walrus: parsed.walrus ?? {},
    };
  } catch {
    return { ...EMPTY, resolutions: {}, walrus: {} };
  }
}

export async function writeState(state: RuntimeState): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  await writeFile(temporary, JSON.stringify(state, null, 2));
  await rename(temporary, filePath);
}

export async function allObservations(): Promise<Observation[]> {
  const state = await readState();
  const byId = new Map<string, Observation>();
  for (const observation of seedObservations) byId.set(observation.id, observation);
  for (const observation of state.observations) byId.set(observation.id, observation);
  return [...byId.values()].sort((a, b) => a.resolvedAt.localeCompare(b.resolvedAt));
}

export async function allCalls(): Promise<ResolvedCall[]> {
  const state = await readState();
  const merged = [...seedCalls, ...state.calls];
  return merged.map((call) => {
    const resolution = state.resolutions[call.id];
    if (!resolution) {
      return { ...call, status: "open" as const, outcome: null, resolvedAt: null };
    }
    return {
      ...call,
      status: "resolved" as const,
      outcome: resolution.outcome,
      resolvedAt: resolution.resolvedAt,
    };
  });
}

export async function findCall(id: string): Promise<ResolvedCall | null> {
  const calls = await allCalls();
  return calls.find((call) => call.id === id) ?? null;
}

export function isSlug(value: string): boolean {
  return /^[a-z0-9-]{1,80}$/.test(value);
}
