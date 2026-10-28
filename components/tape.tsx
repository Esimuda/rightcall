"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CallAssessment, SplitAssessment } from "@/lib/types";
import { pct, signedPp } from "@/lib/utils";

const tone: Record<string, string> = {
  Follow: "text-accent",
  Fade: "text-support",
  Pass: "text-muted",
  "Lean chain": "text-accent",
  "Lean book": "text-support",
  "No edge": "text-muted",
  "Thin sample": "text-muted",
  Blocked: "text-support",
};

export function Tape({
  calls,
  split,
}: {
  calls: { id: string; event: string; sourceName: string; category: string; pick: string; provenance: string; assessment: CallAssessment }[];
  split: SplitAssessment;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return calls;
    return calls.filter((call) =>
      `${call.event} ${call.sourceName} ${call.category} ${call.pick}`.toLowerCase().includes(needle),
    );
  }, [calls, query]);

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted">Filter the tape</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Source, event, category"
          className="mt-2 w-full border border-line bg-ink px-3 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-accent"
        />
      </label>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.16em] text-muted">Open calls</h2>
          <ul className="mt-2 divide-y divide-line border border-line">
            {filtered.length === 0 ? (
              <li className="bg-raised px-4 py-6 text-sm text-muted">No calls match that filter.</li>
            ) : null}
            {filtered.map((call) => {
              const shown = call.assessment.memoryOn ? call.assessment.after : call.assessment.before;
              return (
                <li key={call.id} className="bg-raised">
                  <Link href={`/decisions/${call.id}`} className="grid gap-2 px-4 py-3 hover:bg-ink md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                        {call.provenance === "seed" ? "Seed" : "Yours"} · {call.category}
                      </p>
                      <p className="mt-1 text-base">{call.event}</p>
                      <p className="text-sm text-muted">
                        {call.sourceName} · {call.pick}
                      </p>
                    </div>
                    <p className={`font-display text-3xl ${tone[shown ?? "Pass"]}`}>{shown}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.16em] text-muted">OddsSplit</h2>
          <Link href={`/splits/${split.split.id}`} className="mt-2 block border border-line bg-raised p-4 hover:border-accent">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">BTC expiry · seed quotes</p>
            <p className="mt-2 font-display text-3xl leading-none">{split.split.event}</p>
            <p className="mt-3 text-sm tabular-nums">
              Book {pct(split.split.bookProbability)} · chain {pct(split.split.chainProbability)}
            </p>
            <p className="mt-1 text-2xl tabular-nums text-support">{signedPp(split.gapPp)}</p>
            <p className={`mt-2 text-sm ${tone[split.judgment ?? ""] ?? "text-muted"}`}>
              {split.memoryOn ? split.judgment : "Gap only. Judgment off."}
            </p>
            <p className="mt-2 text-xs capitalize text-muted">Live cohort: {split.relation}</p>
          </Link>
        </section>
      </div>
    </div>
  );
}
