import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";
import { redact } from "@/lib/redact";

/**
 * fetch() that resolves only after secret strings are removed from the body.
 * Node callbacks keep the raw bytes off any promise React's dev renderer can record.
 */
export function scrubbedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers();
  if (typeof input !== "string" && !(input instanceof URL) && "headers" in input) {
    new Headers(input.headers).forEach((value, key) => headers.set(key, value));
  }
  if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  headers.set("accept-encoding", "identity");

  const body = init?.body;
  const payload =
    typeof body === "string"
      ? Buffer.from(body)
      : body instanceof Uint8Array
        ? Buffer.from(body)
        : body == null
          ? null
          : undefined;
  if (payload === undefined) {
    return Promise.reject(new Error("Unsupported fetch body"));
  }
  if (payload) headers.set("content-length", String(payload.length));

  const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = transport(
      url,
      {
        method,
        headers: Object.fromEntries(headers.entries()),
        signal: init?.signal ?? undefined,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer | string) => {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        });
        res.on("end", () => {
          const encoding = String(res.headers["content-encoding"] ?? "");
          let bytes = Buffer.concat(chunks);
          try {
            if (encoding.includes("gzip")) bytes = gunzipSync(bytes);
            else if (encoding.includes("br")) bytes = brotliDecompressSync(bytes);
            else if (encoding.includes("deflate")) bytes = inflateSync(bytes);
          } catch {
            reject(new Error("Could not decode the upstream response"));
            return;
          }
          const headerInit: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            if (key === "content-encoding" || key === "content-length") continue;
            if (typeof value === "string") headerInit[key] = value;
            else if (Array.isArray(value)) headerInit[key] = value.join(", ");
          }
          resolve(
            new Response(redact(bytes.toString("utf8")), {
              status: res.statusCode ?? 500,
              headers: headerInit,
            }),
          );
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let depth = 0;
let previousFetch: typeof fetch | null = null;

/** Run SDK calls whose internal fetch() must not surface delegate material. */
export async function withScrubbedFetch<T>(fn: () => Promise<T>): Promise<T> {
  if (depth === 0) {
    previousFetch = globalThis.fetch;
    globalThis.fetch = scrubbedFetch as typeof fetch;
  }
  depth += 1;
  try {
    return await fn();
  } finally {
    depth -= 1;
    if (depth === 0 && previousFetch) {
      globalThis.fetch = previousFetch;
      previousFetch = null;
    }
  }
}
