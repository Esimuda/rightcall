import Link from "next/link";
import { notFound } from "next/navigation";
import { CallReport } from "@/components/call-report";
import { readChain } from "@/lib/chain";
import { reportCall } from "@/lib/reports";
import { findCall, isSlug, allObservations } from "@/lib/store";
import { recallObservations } from "@/lib/walrus";

export default async function DecisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ memory?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!isSlug(id)) notFound();
  const call = await findCall(id);
  if (!call) notFound();
  const memoryOn = query.memory !== "0";
  const [localObservations, chain] = await Promise.all([allObservations(), readChain()]);
  let observations = localObservations;
  let recallNote: string | null = null;
  const recalled: Record<string, { blobId: string; distance: number }> = {};
  if (memoryOn) {
    try {
      const hits = await recallObservations(
        `${call.sourceName} ${call.category} ${call.focusTags.join(" ")} prediction outcome hit miss calibration`,
        16,
      );
      const merged = new Map(localObservations.map((observation) => [observation.id, observation]));
      for (const hit of hits) {
        merged.set(hit.observation.id, hit.observation);
        recalled[hit.observation.id] = { blobId: hit.blobId, distance: hit.distance };
      }
      observations = [...merged.values()];
      const matched = hits.filter(
        (hit) => hit.observation.sourceId === call.sourceId && hit.observation.category === call.category,
      ).length;
      recallNote = hits.length
        ? `Walrus recall returned ${hits.length} memories, ${matched} for this source and category.`
        : "Walrus recall returned nothing parsed. The desk ledger is still in use.";
    } catch {
      recallNote = "Walrus recall did not answer. The desk ledger is still in use.";
    }
  }
  const assessment = reportCall(call, observations, memoryOn);
  const chainNote = [
    chain.checkpoint
      ? `Chain clock at this read: checkpoint ${chain.checkpoint.toLocaleString("en-US")}${chain.transport === "tatum" ? " via Tatum" : ""}.`
      : null,
    recallNote,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="space-y-6">
      <Link href="/" className="text-[11px] uppercase tracking-[0.16em] text-muted">
        Back to the tape
      </Link>
      <CallReport assessment={assessment} chainNote={chainNote || null} recalled={recalled} />
    </div>
  );
}
