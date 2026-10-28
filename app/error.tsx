"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-support">Desk error</p>
      <h1 className="mt-2 font-display text-5xl">The read failed.</h1>
      <button type="button" onClick={reset} className="mt-4 bg-accent px-4 py-2 text-xs uppercase tracking-[0.14em] text-ink">
        Try again
      </button>
    </div>
  );
}
