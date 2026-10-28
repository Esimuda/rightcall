import { allObservations, readState } from "@/lib/store";
import { walrusStatus } from "@/lib/walrus";
import { shortId, whenUtc } from "@/lib/utils";

export default async function MemoryPage() {
  const [observations, state, walrus] = await Promise.all([allObservations(), readState(), walrusStatus()]);
  const ordered = [...observations].sort((a, b) => b.resolvedAt.localeCompare(a.resolvedAt));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Memory timeline</p>
        <h1 className="mt-2 font-display text-5xl leading-none tracking-tight md:text-6xl">What was stored.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          Each row is a call, a condition, and a result. Not a verdict on the person who made it.
        </p>
      </header>

      <section className="grid gap-px border border-line bg-line md:grid-cols-3">
        <div className="bg-raised p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Ledger</p>
          <p className="mt-2 font-display text-4xl tabular-nums">{ordered.length}</p>
          <p className="text-xs text-muted">Seed plus anything you resolve here.</p>
        </div>
        <div className="bg-raised p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Walrus</p>
          <p className="mt-2 font-display text-4xl">{walrus.configured ? walrus.health : "Local"}</p>
          <p className="text-xs text-muted">{walrus.healthDetail ?? walrus.error ?? "Credentials unset."}</p>
        </div>
        <div className="bg-raised p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Namespace count</p>
          <p className="mt-2 font-display text-4xl tabular-nums">
            {walrus.listed == null ? "—" : walrus.hasMore ? `${walrus.listed}+` : walrus.listed}
          </p>
          <p className="text-xs text-muted">
            {walrus.serverUrl} · {walrus.namespace}
          </p>
        </div>
      </section>

      {walrus.recallSamples.length > 0 ? (
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.16em] text-muted">Latest recall from mainnet</h2>
          <ul className="mt-2 divide-y divide-line border border-line">
            {walrus.recallSamples.map((sample) => (
              <li key={sample.blobId} className="bg-raised px-3 py-3 text-sm">
                <p className="text-[10px] uppercase tracking-[0.14em] text-accent">
                  {shortId(sample.blobId, 10, 6)} · distance {sample.distance.toFixed(3)}
                </p>
                <p className="mt-1 text-muted">{sample.preview}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted">
          No mainnet recall yet. With a delegate key, run <code className="text-text">npm run seed:memories</code> then{" "}
          <code className="text-text">npm run prove:memories</code>.
        </p>
      )}

      <ol className="relative space-y-3 border-l border-line pl-4">
        {ordered.map((observation) => {
          const blob = state.walrus[observation.id];
          return (
            <li key={observation.id} className="border border-line bg-raised p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                  {whenUtc(observation.resolvedAt)} · {observation.provenance === "seed" ? "Seed" : "Yours"} ·{" "}
                  {observation.kind === "prediction_outcome" ? "Outcome" : "Disagreement"}
                </p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-accent">
                  {blob ? `Walrus ${shortId(blob.blobId, 8, 4)}` : "Local ledger"}
                </p>
              </div>
              <p className="mt-2 text-base">
                {observation.sourceName} · {observation.category}
              </p>
              <p className="text-sm text-muted">{observation.event}</p>
              <p className="mt-2 text-sm leading-6">{observation.note}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-muted">{observation.conditions.join(" · ")}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
