import path from "node:path";
import { Worker } from "node:worker_threads";
import { redact } from "@/lib/redact";

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function reset(error: Error) {
  for (const slot of pending.values()) slot.reject(error);
  pending.clear();
  worker = null;
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(path.join(process.cwd(), "lib/memwal-worker.mjs"));
  worker.on("message", (message: { id: number; ok: boolean; result?: unknown; error?: string }) => {
    const slot = pending.get(message.id);
    if (!slot) return;
    pending.delete(message.id);
    if (message.ok) slot.resolve(message.result);
    else slot.reject(new Error(redact(message.error ?? "Walrus request failed")));
  });
  worker.on("error", (error) => {
    reset(new Error(redact(error.message)));
  });
  worker.on("exit", (code) => {
    if (code !== 0) reset(new Error("Walrus worker exited"));
    else worker = null;
  });
  return worker;
}

export function callMemwal<T>(payload: Record<string, unknown>): Promise<T> {
  const id = nextId;
  nextId += 1;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: (value) => resolve(value as T), reject });
    getWorker().postMessage({ ...payload, id });
  });
}
