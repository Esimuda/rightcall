import Link from "next/link";
import { MemoryToggle } from "@/components/memory-toggle";
import type { ChainSnapshot } from "@/lib/chain";
import type { SplitAssessment } from "@/lib/types";
import { pct, signedPp, usd, whenUtc } from "@/lib/utils";

const tone: Record<string, string> = {
  "Lean chain": "text-accent",
  "Lean book": "text-support",
  "No edge": "text-muted",
  "Thin sample": "text-muted",
  Blocked: "text-support",
};

export function SplitReport({
  assessment,
  chain,
}: {
  assessment: SplitAssessment;
  chain: ChainSnapshot;
}) {
  return (
    <article className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">OddsSplit · probabilities are seed</p>
          <h1 className="mt-2 font-display text-4xl leading-none tracking-tight md:text-6xl">{assessment.split.event}</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">{assessment.split.detail}</p>
        </div>
        <MemoryToggle on={assessment.memoryOn} />
      </header>

      <section className="grid gap-px border border-line bg-line md:grid-cols-3">
        <div className="bg-raised p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Book · seed</p>
          <p className="mt-2 font-display text-5xl tabular-nums">{pct(assessment.split.bookProbability)}</p>
        </div>
        <div className="bg-raised p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Chain quote · seed</p>
          <p className="mt-2 font-display text-5xl tabular-nums">{pct(assessment.split.chainProbability)}</p>
        </div>
        <div className="bg-raised p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Gap</p>
          <p className="mt-2 font-display text-5xl tabular-nums text-support">{signedPp(assessment.gapPp)}</p>
          <p className={`mt-2 text-sm ${tone[assessment.judgment ?? ""] ?? "text-muted"}`}>
            {assessment.memoryOn ? assessment.judgment : "Judgment off"}
          </p>
        </div>
      </section>

      <section className="grid gap-px border border-line bg-line sm:grid-cols-3">
        <Live label="Spot · chain" value={chain.spotUsd ? usd(chain.spotUsd) : "Unread"} />
        <Live label="Reference · chain" value={chain.selected?.referenceUsd ? usd(chain.selected.referenceUsd) : "Unread"} />
        <Live label="Cohort" value={assessment.relation} />
      </section>

      <div className="space-y-2">
        {assessment.paragraphs.map((paragraph) => (
          <p key={paragraph} className="max-w-3xl text-sm leading-6">
            {paragraph}
          </p>
        ))}
      </div>

      <p className="text-xs text-muted">
        Quote locked {whenUtc(assessment.split.lockedAt)}. Tatum does not serve this sportsbook number. The live objects decide whether the chain side can be used, and which stored disagreements count.
      </p>

      {assessment.memoryOn ? (
        <ul className="divide-y divide-line border border-line">
          {assessment.used.map((observation) => (
            <li key={observation.id} className="bg-raised px-3 py-3 text-sm">
              <span className="text-muted">{observation.disagreementOutcome === "chain_correct" ? "Chain" : "Book"}</span>
              {" · "}
              {observation.event}
              <span className="mt-1 block text-xs text-muted">{observation.conditions.join(" · ")}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          Historical disagreements stay in memory. <Link className="text-accent" href="?memory=1">Turn memory on</Link> for the lean.
        </p>
      )}
    </article>
  );
}

function Live({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 text-lg capitalize tabular-nums">{value}</p>
    </div>
  );
}
