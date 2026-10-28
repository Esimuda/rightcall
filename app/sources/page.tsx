import Link from "next/link";
import { Sparkline } from "@/components/sparkline";
import { wilson } from "@/lib/learning";
import { sourceRows } from "@/lib/reports";
import { allCalls, allObservations } from "@/lib/store";
import { pct } from "@/lib/utils";

export default async function SourcesPage() {
  const [observations, calls] = await Promise.all([allObservations(), allCalls()]);
  const rows = sourceRows(observations);
  const odds = observations.filter((item) => item.kind === "odds_disagreement");
  const chainWins = odds.filter((item) => item.disagreementOutcome === "chain_correct").length;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Source intelligence</p>
        <h1 className="mt-2 font-display text-5xl leading-none tracking-tight md:text-6xl">By source and category.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          Hit rate for the whole category, with the sample beside it. A decision narrows that book by condition. This is not a rank of people.
        </p>
      </header>
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-raised text-[10px] uppercase tracking-[0.16em] text-muted">
            <tr>
              <th className="px-3 py-3 font-medium">Source</th>
              <th className="px-3 py-3 font-medium">Category</th>
              <th className="px-3 py-3 font-medium">n</th>
              <th className="px-3 py-3 font-medium">Hit rate</th>
              <th className="px-3 py-3 font-medium">Band</th>
              <th className="px-3 py-3 font-medium">Running rate</th>
              <th className="px-3 py-3 font-medium">Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const band = wilson(row.hits, row.n);
              const open = calls.find(
                (call) => call.status === "open" && call.sourceId === row.sourceId && call.category === row.category,
              );
              return (
                <tr key={row.key} className="border-t border-line">
                  <td className="px-3 py-3">{row.sourceName}</td>
                  <td className="px-3 py-3 text-muted">{row.category}</td>
                  <td className="px-3 py-3 tabular-nums">{row.n}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(row.rate)}</td>
                  <td className="px-3 py-3 text-muted">
                    {band.label} {pct(band.low)}–{pct(band.high)}
                  </td>
                  <td className="px-3 py-3">
                    <Sparkline values={row.spark} label={`${row.sourceName} ${row.category} running hit rate`} />
                  </td>
                  <td className="px-3 py-3">
                    {open ? (
                      <Link href={`/decisions/${open.id}`} className="text-accent">
                        {open.event}
                      </Link>
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="border border-line bg-raised p-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">OddsSplit record · seed</p>
        <p className="mt-2 font-display text-4xl">
          Chain side {chainWins} of {odds.length}
        </p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          These are stored disagreements, split again by whether spot was under or over the reference. The live chain read picks the cohort. It does not invent the probabilities.
        </p>
        <Link href="/splits/btc-above-reference" className="mt-3 inline-block text-[11px] uppercase tracking-[0.16em] text-accent">
          Open the live gap
        </Link>
      </section>
    </div>
  );
}
