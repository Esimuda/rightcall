import Link from "next/link";
import { MemoryToggle } from "@/components/memory-toggle";
import { RecallTrack } from "@/components/recall-track";
import { ResolveForm } from "@/components/resolve-form";
import type { CallAssessment } from "@/lib/types";
import { pct, shortId, whenUtc } from "@/lib/utils";

const tone: Record<string, string> = {
  Follow: "text-accent",
  Fade: "text-support",
  Pass: "text-muted",
};

export function CallReport({
  assessment,
  chainNote,
  recalled = {},
}: {
  assessment: CallAssessment;
  chainNote: string | null;
  recalled?: Record<string, { blobId: string; distance: number }>;
}) {
  const shown = assessment.memoryOn ? assessment.after : assessment.before;
  const shownValue = assessment.memoryOn ? assessment.adjusted : assessment.stated;
  return (
    <article className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
            {assessment.call.provenance === "seed" ? "Seed desk" : "Your lock"} · {assessment.call.category}
          </p>
          <h1 className="mt-2 font-display text-4xl leading-none tracking-tight md:text-6xl">
            {assessment.call.event}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {assessment.call.sourceName} · {assessment.call.pick} · locked {whenUtc(assessment.call.lockedAt)}
            {assessment.call.lockedCheckpoint
              ? ` · checkpoint ${assessment.call.lockedCheckpoint.toLocaleString("en-US")}`
              : " · checkpoint not stamped"}
          </p>
        </div>
        <MemoryToggle on={assessment.memoryOn} />
      </header>

      <section className="grid gap-px border border-line bg-line md:grid-cols-2">
        <div className="bg-raised p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Before recall</p>
          <p className={`mt-2 font-display text-5xl ${tone[assessment.before]}`}>{assessment.before}</p>
          <p className="mt-1 tabular-nums text-muted">Stated {pct(assessment.stated)}</p>
        </div>
        <div className="bg-raised p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
            {assessment.memoryOn ? "After recall" : "Memory off"}
          </p>
          <p className={`mt-2 font-display text-5xl ${tone[shown ?? "Pass"]}`}>{shown}</p>
          <p className="mt-1 tabular-nums text-muted">
            {shownValue == null ? "No adjustment" : pct(shownValue)}
          </p>
        </div>
      </section>

      <section className="border border-line bg-ink px-4 py-3">
        <div className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.16em] text-muted">
          <span>Stated</span>
          <span>{assessment.memoryOn ? "Recalled" : "Recall withheld"}</span>
        </div>
        <RecallTrack
          stated={assessment.stated}
          adjusted={assessment.adjusted}
          memoryOn={assessment.memoryOn && assessment.adjusted != null}
        />
      </section>

      <section className="space-y-2">
        {assessment.paragraphs.map((paragraph) => (
          <p key={paragraph} className="max-w-3xl text-sm leading-6">
            {paragraph}
          </p>
        ))}
        {chainNote ? <p className="max-w-3xl text-sm leading-6 text-muted">{chainNote}</p> : null}
      </section>

      {assessment.uncertainty ? (
        <p className="text-xs uppercase tracking-[0.14em] text-muted">
          Sample {assessment.uncertainty.n} · {assessment.uncertainty.label} · band {pct(assessment.uncertainty.low)}–
          {pct(assessment.uncertainty.high)}
        </p>
      ) : null}

      {assessment.call.status === "open" ? <ResolveForm id={assessment.call.id} /> : (
        <p className="text-sm text-muted">
          Resolved {assessment.call.outcome}. The locked pick stays {assessment.call.pick}.
        </p>
      )}

      {assessment.memoryOn ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <MemoryList title="Used in the adjustment" empty="No comparable memory." items={assessment.used.map((item) => toItem(item, recalled))} />
          <MemoryList title="Held out" empty="Nothing in this category was held out." items={assessment.heldOut.map((item) => toItem(item, recalled))} />
        </section>
      ) : (
        <p className="text-sm text-muted">
          Supporting memories are hidden. <Link href="?memory=1" className="text-accent">Turn memory on</Link> to see which outcomes moved the call.
        </p>
      )}
    </article>
  );
}

function toItem(
  observation: CallAssessment["used"][number],
  recalled: Record<string, { blobId: string; distance: number }>,
) {
  const hit = recalled[observation.id];
  const source = hit ? `mainnet ${shortId(hit.blobId, 8, 4)}` : "ledger";
  return {
    id: observation.id,
    title: `${observation.event} · ${observation.pick}`,
    detail: observation.note,
    meta: `${observation.outcome} · stated ${observation.statedConfidence == null ? "—" : pct(observation.statedConfidence)} · ${source} · ${observation.conditions.join(" ")}`,
  };
}

function MemoryList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { id: string; title: string; detail: string; meta: string }[];
}) {
  return (
    <div>
      <h2 className="text-[11px] uppercase tracking-[0.16em] text-muted">{title}</h2>
      {items.length === 0 ? <p className="mt-2 text-sm text-muted">{empty}</p> : null}
      <ul className="mt-2 divide-y divide-line border border-line">
        {items.map((item) => (
          <li key={item.id} className="bg-raised px-3 py-3">
            <p className="text-sm">{item.title}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted">{item.meta}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{item.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
