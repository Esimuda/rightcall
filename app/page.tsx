import Link from "next/link";
import { ChainStrip } from "@/components/chain-strip";
import { LockForm } from "@/components/lock-form";
import { RecallTrack } from "@/components/recall-track";
import { Tape } from "@/components/tape";
import { readChain } from "@/lib/chain";
import { assessCall } from "@/lib/learning";
import { reportSplit } from "@/lib/reports";
import { FEATURED_CALL_ID } from "@/lib/seed";
import { allCalls, allObservations } from "@/lib/store";
import { pct } from "@/lib/utils";

export default async function DiscoverPage() {
  const [calls, observations, chain] = await Promise.all([allCalls(), allObservations(), readChain()]);
  const open = calls.filter((call) => call.status === "open");
  const featured = open.find((call) => call.id === FEATURED_CALL_ID) ?? open[0];
  const featuredReport = featured ? assessCall(featured, observations, true) : null;
  const split = reportSplit("btc-above-reference", observations, true, chain);
  if (!split) return null;

  return (
    <div className="space-y-8">
      <section className="grid items-end gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Prediction desk</p>
          <h1 className="mt-3 max-w-xl font-display text-[2.7rem] leading-[0.92] tracking-tight md:text-7xl">
            Recall changes who you trust.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted">
            Calls lock before the event. Outcomes become memories. The next similar read moves.
          </p>
        </div>
        {featured && featuredReport?.after ? (
          <Link href={`/decisions/${featured.id}`} className="border border-line bg-raised p-4 hover:border-accent">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
              {featured.sourceName} · {featured.category} · seed
            </p>
            <p className="mt-2 font-display text-3xl leading-none">{featured.event}</p>
            <p className="mt-2 text-sm text-muted">{featured.pick}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Before</p>
                <p className={`font-display text-3xl ${featuredReport.before === "Fade" ? "text-support" : featuredReport.before === "Follow" ? "text-accent" : "text-muted"}`}>{featuredReport.before}</p>
                <p className="text-xs tabular-nums text-muted">{pct(featuredReport.stated)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">After</p>
                <p className={`font-display text-3xl ${featuredReport.after === "Fade" ? "text-support" : featuredReport.after === "Follow" ? "text-accent" : "text-muted"}`}>{featuredReport.after}</p>
                <p className="text-xs tabular-nums text-muted">
                  {featuredReport.adjusted == null ? "—" : pct(featuredReport.adjusted)}
                </p>
              </div>
            </div>
            <RecallTrack stated={featuredReport.stated} adjusted={featuredReport.adjusted} memoryOn />
            <p className="text-xs leading-5 text-muted">{featuredReport.paragraphs[0]}</p>
          </Link>
        ) : null}
      </section>

      <ChainStrip chain={chain} />
      <Tape
        calls={open.map((call) => ({
          id: call.id,
          event: call.event,
          sourceName: call.sourceName,
          category: call.category,
          pick: call.pick,
          provenance: call.provenance,
          assessment: assessCall(call, observations, true),
        }))}
        split={split}
      />
      <LockForm />
    </div>
  );
}
