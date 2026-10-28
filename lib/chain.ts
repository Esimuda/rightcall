import { spotRelation } from "@/lib/learning";
import { redact, scrubValue } from "@/lib/redact";
import { scrubbedFetch } from "@/lib/scrub-fetch";
import type { SpotRelation } from "@/lib/types";

export const NAMESPACE = "rightcall";

/** Namespace for Walrus writes. Env override must stay a short slug. */
export function memoryNamespace(): string {
  const value = process.env.MEMWAL_NAMESPACE?.trim();
  if (value && /^[a-z0-9-]{1,64}$/.test(value)) return value;
  return NAMESPACE;
}

export const TATUM_GRAPHQL = "https://sui-mainnet.gateway.tatum.io/graphql";
export const TATUM_GRPC = "https://sui-mainnet-grpc.gateway.tatum.io";
export const PUBLIC_SUI_GRAPHQL = "https://graphql.mainnet.sui.io/graphql";

/** MemWalAccount object this desk asks Tatum to read. A public object id, not a key. */
export const MEMWAL_ACCOUNT_OBJECT = "0x97ea9f5f302b7f0a4222af9ef4dbe908b4f264eabbb7e92fff9de4cfe50f571a";

/** DeepBook Predict mainnet objects. IDs from the Sui docs deployment manifest. */
export const PREDICT = {
  registry: "0x94327dbc256a2cfabd164c2bf4b3fe033bfaa4771f7a6f716954e07cb1b4beba",
  protocolConfig: "0x5fa6efbe7691809565a660adde23f0c184ca1d19cefafa4e1c88d655fe279580",
  poolVault: "0x4d227a1baf8cfcaf6e652a9182d0e63f85f9ce82cd542fdf3356bb3581be3b99",
  pythFeed: "0x4c5d2b4c8238f04b7687c3a8df915b69c50d5f4d291fc49aea44bdb6b52e1a20",
  packageOriginal: "0x89aea622e7bb3bdd598bde87dde40ee31c9eed4971b9546e23ec83de3c48bbba",
} as const;

export type ChainTransport = "tatum" | "public-sui-graphql" | "unconfigured" | "error";

export type ChainCallLog = {
  name: string;
  endpoint: string;
  purpose: string;
  ok: boolean;
  detail: string;
};

export type LiveMarket = {
  id: string;
  expiryMs: number;
  referenceUsd: number | null;
  tickSizeUsd: number;
  mintPaused: boolean;
  cashUsdc: number;
  settled: boolean;
  version: string | null;
};

export type ChainSnapshot = {
  ok: boolean;
  transport: ChainTransport;
  endpoint: string;
  fetchedAt: string;
  error: string | null;
  checkpoint: number | null;
  checkpointTime: string | null;
  tradingPaused: boolean | null;
  frozen: boolean | null;
  versionWatermark: string | null;
  idleUsdc: number | null;
  spotUsd: number | null;
  spotTimestampMs: number | null;
  markets: LiveMarket[];
  selected: LiveMarket | null;
  relation: SpotRelation;
  blockedReason: string | null;
  accountId: string | null;
  accountFound: boolean | null;
  accountType: string | null;
  accountVersion: string | null;
  calls: ChainCallLog[];
};

type Cache = { at: number; value: ChainSnapshot };
let cache: Cache | null = null;
const CACHE_MS = 15_000;

const OBJECT_ID = /^0x[0-9a-fA-F]{64}$/;

export async function readChain(): Promise<ChainSnapshot> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const value = await loadChain();
  if (value.ok) cache = { at: Date.now(), value };
  return value;
}

export function clearChainCache(): void {
  cache = null;
}

async function loadChain(): Promise<ChainSnapshot> {
  const key = process.env.TATUM_API_KEY?.trim();
  const accountId = normalizeAccount(process.env.MEMWAL_ACCOUNT_ID);
  if (key) {
    return queryEndpoint(TATUM_GRAPHQL, "tatum", { "x-api-key": key }, accountId);
  }
  if (process.env.RIGHTCALL_PUBLIC_SUI_FALLBACK === "0") {
    return emptySnapshot("unconfigured", "", "Set TATUM_API_KEY. Public Sui fallback is off.");
  }
  return queryEndpoint(
    PUBLIC_SUI_GRAPHQL,
    "public-sui-graphql",
    {},
    accountId,
  );
}

async function queryEndpoint(
  endpoint: string,
  transport: "tatum" | "public-sui-graphql",
  headers: Record<string, string>,
  accountId: string | null,
): Promise<ChainSnapshot> {
  const calls: ChainCallLog[] = [];
  const base = blank(endpoint, transport, accountId);
  try {
    const root = await graphql(
      endpoint,
      headers,
      rootQuery(accountId),
    );
    calls.push({
      name: "checkpoint + ProtocolConfig + PoolVault + PythFeed",
      endpoint,
      purpose:
        "Chain clock for locks, protocol gates for OddsSplit, the live BTC market list, and the Pyth spot on that market.",
      ok: true,
      detail: "GraphQL object reads",
    });
    const data = asRecord(root.data);
    const checkpoint = asRecord(data.checkpoint);
    base.checkpoint = numberOrNull(checkpoint.sequenceNumber);
    base.checkpointTime = stringOrNull(checkpoint.timestamp);

    const protocol = moveJson(data.protocol);
    base.tradingPaused = boolOrNull(protocol?.trading_paused);
    base.frozen = boolOrNull(protocol?.frozen);
    base.versionWatermark = protocol ? String(protocol.version_watermark ?? "") : null;

    const vault = moveJson(data.vault);
    const accounting = asRecord(vault?.expiry_accounting);
    const idle = accounting?.idle_balance;
    base.idleUsdc = idle == null ? null : Number(idle) / 1_000_000;
    const active = Array.isArray(accounting?.active_expiry_markets)
      ? accounting.active_expiry_markets
      : [];
    const marketIds = active
      .map((entry) => stringOrNull(asRecord(entry).expiry_market_id))
      .filter((id): id is string => Boolean(id && OBJECT_ID.test(id)))
      .slice(0, 6);

    const pyth = moveJson(data.pyth);
    const pythValue = asRecord(asRecord(asRecord(pyth?.lane).latest).value);
    base.spotUsd = decodePythPrice(pythValue);
    const spotTs = stringOrNull(asRecord(asRecord(pyth?.lane).latest).source_timestamp_ms);
    base.spotTimestampMs = spotTs ? Number(spotTs) : null;

    if (accountId) {
      const account = asRecord(data.account);
      const typeName = stringOrNull(asRecord(asRecord(asRecord(account.asMoveObject).contents).type).repr);
      base.accountFound = Boolean(account.address);
      base.accountType = typeName;
      base.accountVersion = account.version == null ? null : String(account.version);
      calls.push({
        name: "MemWalAccount object",
        endpoint,
        purpose: "Confirm the memory account object exists before treating Walrus writes as anchored.",
        ok: base.accountFound === true,
        detail: base.accountFound
          ? accountId === MEMWAL_ACCOUNT_OBJECT
            ? MEMWAL_ACCOUNT_OBJECT
            : "object found"
          : "object missing",
      });
    }

    if (marketIds.length) {
      const marketsResult = await graphql(endpoint, headers, marketsQuery(marketIds));
      calls.push({
        name: "ExpiryMarket objects",
        endpoint,
        purpose: "Read reference strike, cash, and mint pause on each active BTC expiry.",
        ok: true,
        detail: marketIds.join(", "),
      });
      const marketData = asRecord(marketsResult.data);
      base.markets = marketIds.map((id, index) => decodeMarket(id, marketData[`m${index}`]));
    }

    base.selected = chooseMarket(base.markets);
    base.relation = spotRelation(base.spotUsd, base.selected?.referenceUsd ?? null);
    base.blockedReason = gateReason(base);
    base.calls = calls;
    base.ok = true;
    base.accountId = null;
    return base;
  } catch (error) {
    const message = scrubAccount(error instanceof Error ? error.message : "Chain read failed", accountId);
    calls.push({
      name: "GraphQL",
      endpoint,
      purpose: "Live Sui reads for the lock clock and OddsSplit gate.",
      ok: false,
      detail: message,
    });
    return {
      ...base,
      ok: false,
      transport: "error",
      error: message,
      accountId: null,
      calls,
      blockedReason: "Chain read failed, so the protocol gate cannot clear the chain side.",
    };
  }
}

function scrubAccount(message: string, accountId: string | null): string {
  const named = accountId ? message.split(accountId).join("[account]") : message;
  return redact(named);
}

function rootQuery(accountId: string | null): string {
  const account = accountId
    ? `account: object(address: "${accountId}") { address version asMoveObject { contents { type { repr } } } }`
    : "";
  return `query RightCallRoot {
    checkpoint { sequenceNumber timestamp }
    protocol: object(address: "${PREDICT.protocolConfig}") { version asMoveObject { contents { json } } }
    vault: object(address: "${PREDICT.poolVault}") { version asMoveObject { contents { json } } }
    pyth: object(address: "${PREDICT.pythFeed}") { version asMoveObject { contents { json } } }
    ${account}
  }`;
}

function marketsQuery(ids: string[]): string {
  const fields = ids
    .map(
      (id, index) =>
        `m${index}: object(address: "${id}") { version asMoveObject { contents { json } } }`,
    )
    .join("\n");
  return `query RightCallMarkets { ${fields} }`;
}

async function graphql(
  endpoint: string,
  headers: Record<string, string>,
  query: string,
): Promise<{ data?: unknown; errors?: { message: string }[] }> {
  const response = await scrubbedFetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${redact(text).slice(0, 180)}`);
  }
  const body = scrubValue(JSON.parse(text) as { data?: unknown; errors?: { message: string }[] });
  if (!body.data && body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join("; "));
  }
  return body;
}

export function decodePythPrice(value: Record<string, unknown> | null): number | null {
  if (!value) return null;
  const magnitude = stringOrNull(value.price_magnitude) ?? (typeof value.price_magnitude === "number" ? String(value.price_magnitude) : null);
  if (!magnitude) return null;
  const exponent = Number(value.exponent_magnitude ?? 0);
  if (!Number.isFinite(exponent)) return null;
  const negativePrice = value.price_is_negative === true;
  const negativeExponent = value.exponent_is_negative !== false;
  const mag = BigInt(magnitude);
  const scale = BigInt(10) ** BigInt(Math.max(0, Math.trunc(exponent)));
  const price = negativeExponent ? Number(mag) / Number(scale) : Number(mag * scale);
  if (!Number.isFinite(price)) return null;
  return negativePrice ? -price : price;
}

export function referenceUsd(referenceTick: string | number | null, tickSize: string | number | null): number | null {
  if (referenceTick == null || tickSize == null) return null;
  const tick = BigInt(referenceTick);
  const size = BigInt(tickSize);
  const raw = tick * size;
  const usd = Number(raw) / 1_000_000_000;
  return Number.isFinite(usd) ? usd : null;
}

function decodeMarket(id: string, node: unknown): LiveMarket {
  const json = moveJson(node);
  const exposure = asRecord(json?.strike_exposure);
  const cash = asRecord(json?.cash);
  const tickSize = exposure?.tick_size == null ? 0.01 : Number(exposure.tick_size) / 1_000_000_000;
  return {
    id,
    expiryMs: Number(json?.expiry ?? 0),
    referenceUsd: referenceUsd(
      (exposure?.reference_tick as string | number | null) ?? null,
      (exposure?.tick_size as string | number | null) ?? null,
    ),
    tickSizeUsd: Number.isFinite(tickSize) ? tickSize : 0.01,
    mintPaused: json?.mint_paused === true,
    cashUsdc: Number(cash?.cash_balance ?? 0) / 1_000_000,
    settled: exposure?.settlement_price != null,
    version: node && typeof node === "object" && "version" in node ? String((node as { version: unknown }).version) : null,
  };
}

function chooseMarket(markets: LiveMarket[]): LiveMarket | null {
  if (!markets.length) return null;
  const now = Date.now();
  const future = markets
    .filter((market) => market.expiryMs > now && !market.settled)
    .sort((a, b) => a.expiryMs - b.expiryMs);
  const withReference = future.find((market) => market.referenceUsd != null);
  if (withReference) return withReference;
  if (future[0]) return future[0];
  return [...markets].sort((a, b) => b.expiryMs - a.expiryMs)[0] ?? null;
}

function gateReason(snapshot: ChainSnapshot): string | null {
  if (snapshot.tradingPaused) {
    return "DeepBook Predict trading_paused is true. The chain side is not executable.";
  }
  if (snapshot.frozen) {
    return "DeepBook Predict is frozen. The chain side is not executable.";
  }
  if (!snapshot.selected) {
    return "PoolVault returned no active ExpiryMarket. There is no live chain market to lean on.";
  }
  if (snapshot.selected.expiryMs <= Date.now()) {
    return "The latest ExpiryMarket is already past expiry. A fresh chain quote is not live.";
  }
  if (snapshot.selected.referenceUsd == null) {
    return "The live market has no reference strike yet, so spot cannot be placed against it.";
  }
  return null;
}

function blank(endpoint: string, transport: ChainTransport, accountId: string | null): ChainSnapshot {
  return {
    ok: false,
    transport,
    endpoint,
    fetchedAt: new Date().toISOString(),
    error: null,
    checkpoint: null,
    checkpointTime: null,
    tradingPaused: null,
    frozen: null,
    versionWatermark: null,
    idleUsdc: null,
    spotUsd: null,
    spotTimestampMs: null,
    markets: [],
    selected: null,
    relation: "unknown",
    blockedReason: null,
    accountId,
    accountFound: null,
    accountType: null,
    accountVersion: null,
    calls: [],
  };
}

function emptySnapshot(transport: ChainTransport, endpoint: string, error: string): ChainSnapshot {
  return {
    ...blank(endpoint, transport, null),
    error,
    blockedReason: error,
    calls: [
      {
        name: "Tatum GraphQL",
        endpoint: TATUM_GRAPHQL,
        purpose: "Would read checkpoint, ProtocolConfig, PoolVault, PythFeed, and ExpiryMarket.",
        ok: false,
        detail: error,
      },
    ],
  };
}

function normalizeAccount(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return OBJECT_ID.test(trimmed) ? trimmed : null;
}

function moveJson(node: unknown): Record<string, unknown> | null {
  const object = asRecord(node);
  const contents = asRecord(asRecord(object.asMoveObject).contents);
  return asRecord(contents.json);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}
