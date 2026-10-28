"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ResolveForm({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function resolve(outcome: "hit" | "miss") {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/calls/${id}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ outcome }),
    });
    const body = (await response.json()) as { error?: string; storage?: string; blobId?: string | null; walrusError?: string | null };
    setPending(false);
    if (!response.ok) {
      setError(body.error ?? "Could not record the outcome.");
      return;
    }
    setNote(
      body.storage === "walrus" && body.blobId
        ? `Stored on Walrus. Blob ${body.blobId}.`
        : body.walrusError
          ? `Saved on the local ledger. Walrus: ${body.walrusError}`
          : "Saved on the local ledger. Walrus credentials are not set.",
    );
    router.refresh();
  }

  return (
    <div className="border border-line bg-raised p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Record the outcome</p>
      <p className="mt-1 text-sm text-muted">This writes an observation. It does not change the locked pick.</p>
      <div className="mt-3 flex gap-2">
        <Button type="button" disabled={pending} onClick={() => resolve("hit")}>
          Hit
        </Button>
        <Button type="button" variant="support" disabled={pending} onClick={() => resolve("miss")}>
          Miss
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-support">{error}</p> : null}
      {note ? <p className="mt-3 text-sm text-text">{note}</p> : null}
    </div>
  );
}
