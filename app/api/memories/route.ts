import { allObservations, readState } from "@/lib/store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const [observations, state] = await Promise.all([allObservations(), readState()]);
  return NextResponse.json({
    count: observations.length,
    observations: observations.map((observation) => ({
      ...observation,
      blobId: state.walrus[observation.id]?.blobId ?? null,
    })),
  });
}
