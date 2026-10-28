/**
 * Optional Tatum AI Builder hook. Not used by the learning loop.
 * Catalog: https://ai.tatum.io/openapi
 * Auth: https://ai.tatum.io/auth — header `x-api-key`, host `https://api.tatum.io`.
 */
export async function tatumSuiUsd(): Promise<
  | { configured: false }
  | { configured: true; ok: true; value: string }
  | { configured: true; ok: false; error: string }
> {
  const key = process.env.TATUM_API_KEY?.trim();
  if (!key) return { configured: false };
  try {
    const response = await fetch("https://api.tatum.io/v4/data/exchange-rate?currency=SUI&basePair=USD", {
      headers: { "x-api-key": key },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) {
      return { configured: true, ok: false, error: `${response.status}` };
    }
    const body = (await response.json()) as { value?: string };
    return { configured: true, ok: true, value: body.value ?? "" };
  } catch (error) {
    return { configured: true, ok: false, error: error instanceof Error ? error.message : "request failed" };
  }
}
