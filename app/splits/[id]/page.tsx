import Link from "next/link";
import { notFound } from "next/navigation";
import { ChainStrip } from "@/components/chain-strip";
import { SplitReport } from "@/components/split-report";
import { readChain } from "@/lib/chain";
import { reportSplit } from "@/lib/reports";
import { isSlug, allObservations } from "@/lib/store";

export default async function SplitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ memory?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!isSlug(id)) notFound();
  const [observations, chain] = await Promise.all([allObservations(), readChain()]);
  const assessment = reportSplit(id, observations, query.memory !== "0", chain);
  if (!assessment) notFound();
  return (
    <div className="space-y-6">
      <Link href="/" className="text-[11px] uppercase tracking-[0.16em] text-muted">
        Back to the tape
      </Link>
      <SplitReport assessment={assessment} chain={chain} />
      <ChainStrip chain={chain} />
    </div>
  );
}
