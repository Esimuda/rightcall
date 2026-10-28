import { SCHEMA, type Observation } from "@/lib/types";

const MARKER = "RIGHTCALL_JSON ";

export function observationToText(observation: Observation): string {
  return `${observation.note}\n${MARKER}${JSON.stringify(observation)}`;
}

export function parseObservationText(text: string): Observation | null {
  const index = text.lastIndexOf(MARKER);
  if (index === -1) return null;
  try {
    const parsed = JSON.parse(text.slice(index + MARKER.length)) as Observation;
    if (parsed.schema !== SCHEMA || typeof parsed.id !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function seedMarkerText(count: number): string {
  return `RIGHTCALL_SEED_MARKER batch=seed-2026-10-27 namespace=rightcall count=${count} schema=${SCHEMA}`;
}
