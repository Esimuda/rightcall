import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function signedPp(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded} pp`;
  if (rounded < 0) return `${rounded} pp`;
  return "0 pp";
}

export function usd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function usdc(raw: string | number): string {
  const n = Number(raw) / 1_000_000;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function whenUtc(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return (
    date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      hourCycle: "h23",
    }) + " UTC"
  );
}

export function shortId(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
