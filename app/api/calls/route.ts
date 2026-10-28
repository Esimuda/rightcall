import { readChain } from "@/lib/chain";
import { CATEGORIES, sources } from "@/lib/seed";
import { isSlug, readState, writeState } from "@/lib/store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  sourceName?: unknown;
  category?: unknown;
  event?: unknown;
  pick?: unknown;
  statedConfidence?: unknown;
  startsAt?: unknown;
  conditions?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });

  const sourceName = clean(body.sourceName, 48);
  const event = clean(body.event, 80);
  const pick = clean(body.pick, 48);
  const category = typeof body.category === "string" ? body.category : "";
  const confidence = typeof body.statedConfidence === "number" ? body.statedConfidence : Number(body.statedConfidence);
  const startsAt = typeof body.startsAt === "string" ? new Date(body.startsAt) : null;
  const conditions = Array.isArray(body.conditions)
    ? body.conditions
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase().replace(/\s+/g, "-"))
        .filter((item) => /^[a-z0-9-]{1,32}$/.test(item))
        .slice(0, 6)
    : [];

  if (!sourceName || sourceName.length < 2) {
    return NextResponse.json({ error: "Name the source." }, { status: 400 });
  }
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: "Pick a category from the desk." }, { status: 400 });
  }
  if (!event || !pick) {
    return NextResponse.json({ error: "Event and pick are required." }, { status: 400 });
  }
  if (!Number.isFinite(confidence) || confidence < 0.05 || confidence > 0.95) {
    return NextResponse.json({ error: "Confidence must sit between 0.05 and 0.95." }, { status: 400 });
  }
  if (!startsAt || Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now() + 60_000) {
    return NextResponse.json({ error: "The event has to start at least a minute from now." }, { status: 400 });
  }

  const known = sources.find((source) => source.name.toLowerCase() === sourceName.toLowerCase());
  const sourceId = known?.id ?? slugify(sourceName);
  const id = `${sourceId}-${slugify(event)}-${Date.now().toString(36)}`.slice(0, 80);
  if (!isSlug(id) || !isSlug(sourceId)) {
    return NextResponse.json({ error: "Could not build an id from that name." }, { status: 400 });
  }

  const chain = await readChain();
  const state = await readState();
  state.calls.push({
    id,
    sourceId,
    sourceName: known?.name ?? sourceName,
    category,
    event,
    pick,
    statedConfidence: confidence,
    conditions,
    focusTags: conditions,
    lockedAt: new Date().toISOString(),
    startsAt: startsAt.toISOString(),
    lockedCheckpoint: chain.ok ? chain.checkpoint : null,
    provenance: "user",
  });
  await writeState(state);
  return NextResponse.json({ id, lockedCheckpoint: chain.ok ? chain.checkpoint : null });
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
