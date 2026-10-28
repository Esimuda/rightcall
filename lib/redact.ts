const SECRET_ENV = [
  "TATUM_API_KEY",
  "MEMWAL_KEY",
  "MEMWAL_PRIVATE_KEY",
  "MEMWAL_DELEGATE_PUBLIC_KEY",
  "MEMWAL_ACCOUNT_ID",
  "SUI_ADDRESS",
  "TATUM_ACCOUNT_ID",
  "TATUM_ORG_ID",
] as const;

/** Replace runtime secrets with their env names. Safe to put on a page or in a log. */
export function redact(message: string): string {
  let out = message;
  for (const name of SECRET_ENV) {
    const value = process.env[name]?.trim();
    if (!value || value.length < 16) continue;
    if (out.includes(value)) out = out.split(value).join(`[${name}]`);
  }
  return out;
}

const DROP_KEYS = new Set(["agent_id", "agentId", "private_key", "privateKey", "delegate_public_key"]);

/** Drop delegate identifiers and rewrite secret strings before a value can be serialized. */
export function scrubValue<T>(value: T): T {
  return walk(value, new WeakSet()) as T;
}

function walk(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return redact(value);
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return value;
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => walk(item, seen));
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (DROP_KEYS.has(key)) continue;
    out[key] = walk(entry, seen);
  }
  return out;
}
