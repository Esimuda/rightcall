import { memoryNamespace } from "../lib/chain";
import { redact } from "../lib/redact";
import { parseObservationText } from "../lib/observation-text";

const key = process.env.MEMWAL_KEY?.trim() || process.env.MEMWAL_PRIVATE_KEY?.trim();
const accountId = process.env.MEMWAL_ACCOUNT_ID?.trim();
const serverUrl = process.env.MEMWAL_SERVER_URL?.trim() || "https://relayer.memory.walrus.xyz";

async function main() {
  if (!key || !accountId) {
    console.error("Set MEMWAL_KEY (or MEMWAL_PRIVATE_KEY) and MEMWAL_ACCOUNT_ID before proving mainnet memories.");
    process.exit(1);
  }

  const { MemWal } = await import("@mysten-incubation/memwal");
  const namespace = memoryNamespace();
  const memwal = MemWal.create({ key, accountId, serverUrl, namespace });
  try {
    await memwal.health();
  } catch (error) {
    console.error(redact(error instanceof Error ? error.message : "relayer health failed"));
    process.exit(1);
  }

  let cursor: string | undefined;
  let listed = 0;
  let pages = 0;
  let recalled: { results: { blob_id: string; text: string; distance: number }[] };
  try {
    while (pages < 8) {
      const page = await memwal.listMemories({ limit: 100, namespace, cursor });
      listed += page.memories.filter((memory) => memory.namespace_id === namespace).length;
      pages += 1;
      if (!page.has_more || !page.next_cursor) break;
      cursor = page.next_cursor;
    }

    recalled = await memwal.recall({
      query: "RightCall observation prediction outcome calibration BTC disagreement",
      limit: 12,
      namespace,
    });
  } catch (error) {
    console.error(redact(error instanceof Error ? error.message : "prove failed"));
    process.exit(1);
  }
  const parsed = recalled.results.map((hit) => parseObservationText(hit.text)).filter((item) => item != null);

  console.log(`namespace=${namespace}`);
  console.log(`listed_in_namespace=${listed}`);
  console.log(`recall_hits=${recalled.results.length}`);
  console.log(`parsed_observations=${parsed.length}`);
  for (const hit of recalled.results.slice(0, 5)) {
    console.log(`- ${hit.blob_id} distance=${hit.distance.toFixed(3)} ${hit.text.replace(/\s+/g, " ").slice(0, 140)}`);
  }

  if (listed < 10 && parsed.length < 10) {
    console.error("Fewer than 10 mainnet memories. Run npm run seed:memories.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
