import { readChain } from "@/lib/chain";
import { reportCall } from "@/lib/reports";
import { allObservations, findCall, isSlug } from "@/lib/store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isSlug(id)) return NextResponse.json({ error: "Unknown call." }, { status: 404 });
  const call = await findCall(id);
  if (!call) return NextResponse.json({ error: "Unknown call." }, { status: 404 });
  const memory = new URL(request.url).searchParams.get("memory") !== "0";
  const [observations, chain] = await Promise.all([allObservations(), readChain()]);
  return NextResponse.json({ assessment: reportCall(call, observations, memory), chainTransport: chain.transport });
}
