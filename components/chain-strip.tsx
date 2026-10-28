import type { ChainSnapshot } from "@/lib/chain";
import { usd, whenUtc } from "@/lib/utils";

export function ChainStrip({ chain }: { chain: ChainSnapshot }) {
  const via =
    chain.transport === "tatum"
      ? "Tatum GraphQL"
      : chain.endpoint.includes("tatum.io")
        ? "Tatum request failed"
        : chain.transport === "public-sui-graphql"
          ? "Public Sui GraphQL"
          : "Tatum key unset";
  const protocol =
    chain.tradingPaused == null
      ? "unread"
      : chain.frozen
        ? "frozen"
        : chain.tradingPaused
          ? "paused"
          : "open";
  return (
    <section className="border border-line bg-raised">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Onchain read</p>
          <p className="mt-1 text-sm">{via}</p>
        </div>
        {chain.transport === "tatum" ? (
          <p className="text-xs text-accent">
            Live through Tatum GraphQL
            {chain.accountFound ? " · MemWalAccount object read" : ""}.
          </p>
        ) : chain.transport === "error" ? (
          <p className="max-w-md text-xs leading-5 text-support">The chain read failed. OddsSplit will not treat the chain side as executable.</p>
        ) : (
          <p className="max-w-md text-xs leading-5 text-muted">
            Public Sui node, same objects. Set TATUM_API_KEY to send this query to sui-mainnet.gateway.tatum.io.
          </p>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        <Stat label="Checkpoint" value={chain.checkpoint ? chain.checkpoint.toLocaleString("en-US") : "—"} />
        <Stat label="Protocol" value={protocol} />
        <Stat label="BTC spot" value={chain.spotUsd ? usd(chain.spotUsd) : "—"} />
        <Stat label="Reference" value={chain.selected?.referenceUsd ? usd(chain.selected.referenceUsd) : "—"} />
      </dl>
      <p className="px-4 py-3 text-xs leading-5 text-muted">
        {chain.error
          ? chain.error
          : chain.blockedReason
            ? chain.blockedReason
            : chain.selected
              ? `Active expiry ${new Date(chain.selected.expiryMs).toISOString().slice(11, 16)} UTC · mint ${chain.selected.mintPaused ? "paused" : "open"} · pool idle ${chain.idleUsdc ? usd(chain.idleUsdc) : "—"}.`
              : "No market selected."}
        {chain.checkpointTime ? ` Checkpoint time ${whenUtc(chain.checkpointTime)}.` : ""}
      </p>
      <details className="border-t border-line px-4 py-3">
        <summary className="cursor-pointer text-[11px] uppercase tracking-[0.16em] text-muted">
          Which reads ran
        </summary>
        <ul className="mt-3 space-y-3">
          {chain.calls.map((call) => (
            <li key={call.name} className="text-sm">
              <p className="text-text">
                {call.ok ? "Ran" : "Failed"} · {call.name}
              </p>
              <p className="text-xs leading-5 text-muted">{call.purpose}</p>
              <p className="truncate text-xs text-muted">{call.detail}</p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-raised px-4 py-3">
      <dt className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="mt-1 font-sans text-lg tabular-nums">{value}</dd>
    </div>
  );
}
