"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/seed";

export function LockForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const conditions = String(form.get("conditions") ?? "")
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
    const response = await fetch("/api/calls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceName: form.get("sourceName"),
        category: form.get("category"),
        event: form.get("event"),
        pick: form.get("pick"),
        statedConfidence: Number(form.get("statedConfidence")),
        startsAt: new Date(String(form.get("startsAt"))).toISOString(),
        conditions,
      }),
    });
    const body = (await response.json()) as { error?: string; id?: string };
    setPending(false);
    if (!response.ok || !body.id) {
      setError(body.error ?? "Could not lock the call.");
      return;
    }
    router.push(`/decisions/${body.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 border border-line bg-raised p-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Lock a call</p>
        <p className="mt-1 text-sm text-muted">It stamps the server clock and the chain checkpoint. The pick cannot be edited after.</p>
      </div>
      <Field label="Source" name="sourceName" placeholder="Your name" />
      <label className="block text-[11px] uppercase tracking-[0.14em] text-muted">
        Category
        <select name="category" className="mt-1 w-full border border-line bg-ink px-3 py-2 text-sm text-text" defaultValue={CATEGORIES[0]}>
          {CATEGORIES.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </label>
      <Field label="Event" name="event" placeholder="Team at team" />
      <Field label="Pick" name="pick" placeholder="Under 47.5" />
      <label className="block text-[11px] uppercase tracking-[0.14em] text-muted">
        Stated confidence
        <input
          name="statedConfidence"
          type="number"
          min={0.05}
          max={0.95}
          step={0.01}
          defaultValue={0.62}
          required
          className="mt-1 w-full border border-line bg-ink px-3 py-2 text-sm text-text"
        />
      </label>
      <label className="block text-[11px] uppercase tracking-[0.14em] text-muted">
        Starts
        <input name="startsAt" type="datetime-local" required className="mt-1 w-full border border-line bg-ink px-3 py-2 text-sm text-text" />
      </label>
      <label className="block text-[11px] uppercase tracking-[0.14em] text-muted md:col-span-2">
        Conditions, comma separated
        <input name="conditions" placeholder="primetime, under" className="mt-1 w-full border border-line bg-ink px-3 py-2 text-sm normal-case tracking-normal text-text" />
      </label>
      {error ? <p className="text-sm text-support md:col-span-2">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Locking" : "Lock call"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, name, placeholder }: { label: string; name: string; placeholder: string }) {
  return (
    <label className="block text-[11px] uppercase tracking-[0.14em] text-muted">
      {label}
      <input
        name={name}
        required
        placeholder={placeholder}
        className="mt-1 w-full border border-line bg-ink px-3 py-2 text-sm normal-case tracking-normal text-text placeholder:text-muted/70"
      />
    </label>
  );
}
