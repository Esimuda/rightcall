import { readChain } from "@/lib/chain";
import { reportSplit } from "@/lib/reports";
import { allObservations, isSlug } from "@/lib/store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isSlug(id)) return NextResponse.json({ error: "Unknown split." }, { status: 404 });
  const memory = new URL(request.url).searchParams.get("memory") !== "0";
  const [observations, chain] = await Promise.all([allObservations(), readChain()]);
  const assessment = reportSplit(id, observations, memory, chain);
  if (!assessment) return NextResponse.json({ error: "Unknown split." }, { status: 404 });
  return NextResponse.json({ assessment, chain });
}
