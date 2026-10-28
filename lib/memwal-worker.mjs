import { parentPort } from "node:worker_threads";
import { MemWal } from "@mysten-incubation/memwal";

const SECRET_ENV = [
  "TATUM_API_KEY",
  "MEMWAL_KEY",
  "MEMWAL_PRIVATE_KEY",
  "MEMWAL_DELEGATE_PUBLIC_KEY",
  "MEMWAL_ACCOUNT_ID",
  "SUI_ADDRESS",
  "TATUM_ACCOUNT_ID",
  "TATUM_ORG_ID",
];

function redact(message) {
  let out = String(message ?? "");
  for (const name of SECRET_ENV) {
    const value = process.env[name]?.trim();
    if (!value || value.length < 16) continue;
    if (out.includes(value)) out = out.split(value).join(`[${name}]`);
  }
  return out;
}

function previewText(text) {
  const marker = text.indexOf("RIGHTCALL_JSON");
  const prose = (marker === -1 ? text : text.slice(0, marker)).replace(/\s+/g, " ").trim();
  return prose.slice(0, 180);
}

const key = process.env.MEMWAL_KEY?.trim() || process.env.MEMWAL_PRIVATE_KEY?.trim();
const accountId = process.env.MEMWAL_ACCOUNT_ID?.trim();
const serverUrl = process.env.MEMWAL_SERVER_URL?.trim() || "https://relayer.memory.walrus.xyz";
const namespace = /^[a-z0-9-]{1,64}$/.test(process.env.MEMWAL_NAMESPACE?.trim() ?? "")
  ? process.env.MEMWAL_NAMESPACE.trim()
  : "rightcall";

let client = null;
function memwal() {
  if (!key || !accountId) throw new Error("Walrus credentials are not set");
  if (!client) client = MemWal.create({ key, accountId, serverUrl, namespace });
  return client;
}

async function handle(message) {
  if (message.op === "status") {
    await memwal().health();
    const page = await memwal().listMemories({ limit: 100, namespace });
    const recalled = await memwal().recall({
      query: "RightCall observation prediction outcome calibration odds disagreement",
      limit: 8,
      namespace,
    });
    return {
      health: "ok",
      listed: page.memories.filter((memory) => memory.namespace_id === namespace).length,
      hasMore: Boolean(page.has_more),
      recallSamples: recalled.results.map((hit) => ({
        blobId: hit.blob_id,
        distance: hit.distance,
        preview: previewText(hit.text ?? ""),
      })),
    };
  }
  if (message.op === "recall") {
    const recalled = await memwal().recall({
      query: message.query,
      limit: message.limit ?? 12,
      namespace,
    });
    return recalled.results.map((hit) => ({
      blobId: hit.blob_id,
      distance: hit.distance,
      text: hit.text ?? "",
    }));
  }
  if (message.op === "remember") {
    const stored = await memwal().rememberAndWait(message.text, {
      idempotencyKey: message.idempotencyKey,
      timeoutMs: message.timeoutMs ?? 90_000,
    });
    return { blobId: stored.blob_id };
  }
  throw new Error("Unknown Walrus op");
}

parentPort.on("message", async (message) => {
  try {
    const result = await handle(message);
    parentPort.postMessage({ id: message.id, ok: true, result });
  } catch (error) {
    parentPort.postMessage({
      id: message.id,
      ok: false,
      error: redact(error instanceof Error ? error.message : "Walrus request failed"),
    });
  }
});
