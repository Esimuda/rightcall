import { memoryNamespace } from "../lib/chain";
import { redact } from "../lib/redact";
import { observationToText, seedMarkerText } from "../lib/observation-text";
import { seedObservations } from "../lib/seed";
import { readState, writeState } from "../lib/store";

const key = process.env.MEMWAL_KEY?.trim() || process.env.MEMWAL_PRIVATE_KEY?.trim();
const accountId = process.env.MEMWAL_ACCOUNT_ID?.trim();
const serverUrl = process.env.MEMWAL_SERVER_URL?.trim() || "https://relayer.memory.walrus.xyz";

async function main() {
  if (!key || !accountId) {
    console.error("Set MEMWAL_KEY (or MEMWAL_PRIVATE_KEY) and MEMWAL_ACCOUNT_ID. The hosted relayer is https://relayer.memory.walrus.xyz.");
    process.exit(1);
  }

  const { MemWal } = await import("@mysten-incubation/memwal");
  const namespace = memoryNamespace();
  const memwal = MemWal.create({
    key,
    accountId,
    serverUrl,
    namespace,
  });

  try {
    await memwal.health();
  } catch (error) {
    console.error(redact(error instanceof Error ? error.message : "relayer health failed"));
    process.exit(1);
  }

  const items = [
    ...seedObservations.map((observation) => ({ id: observation.id, text: observationToText(observation) })),
    { id: "seed-marker-2026-10-27", text: seedMarkerText(seedObservations.length) },
  ];

  const state = await readState();
  let stored = 0;

  for (let index = 0; index < items.length; index += 15) {
    const batch = items.slice(index, index + 15);
    const pending = batch.filter((item) => item.id === "seed-marker-2026-10-27" || !state.walrus[item.id]);
    if (pending.length === 0) {
      console.log(`batch ${index / 15 + 1} already indexed locally`);
      continue;
    }
    try {
      const result = await memwal.rememberBulkAndWait(
        pending.map((item) => ({ text: item.text, namespace })),
        {
          idempotencyKey: `rightcall-seed-2026-10-27-${index}`,
          timeoutMs: 180_000,
        },
      );
      result.results.forEach((entry, entryIndex) => {
        const item = pending[entryIndex];
        if (!item || entry.status !== "done" || !entry.blob_id) {
          console.error(`failed ${item?.id}: ${entry.status} ${redact(entry.error ?? "")}`);
          return;
        }
        if (item.id !== "seed-marker-2026-10-27") {
          state.walrus[item.id] = { blobId: entry.blob_id, storedAt: new Date().toISOString() };
        }
        stored += 1;
        console.log(`stored ${item.id} ${entry.blob_id}`);
      });
      await writeState(state);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("409")) {
        console.log(`batch ${index / 15 + 1} already accepted by the relayer`);
        continue;
      }
      console.error(redact(message));
      process.exit(1);
    }
  }

  console.log(`done. new writes this run: ${stored}. local walrus index: ${Object.keys(state.walrus).length}.`);
}

main().catch((error) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
