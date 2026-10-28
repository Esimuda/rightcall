"use client";

import { motion } from "framer-motion";

export function RecallTrack({
  stated,
  adjusted,
  memoryOn,
}: {
  stated: number;
  adjusted: number | null;
  memoryOn: boolean;
}) {
  const statedLeft = `${clamp(stated) * 100}%`;
  const adjustedLeft = `${clamp(adjusted ?? stated) * 100}%`;
  return (
    <div className="relative h-10">
      <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
      <span
        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 border border-text bg-ink"
        style={{ left: statedLeft }}
        title="Stated"
      />
      {memoryOn && adjusted != null ? (
        <motion.span
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 bg-accent"
          initial={{ left: statedLeft }}
          animate={{ left: adjustedLeft }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          title="After recall"
        />
      ) : null}
    </div>
  );
}

function clamp(value: number) {
  return Math.min(0.98, Math.max(0.02, value));
}
