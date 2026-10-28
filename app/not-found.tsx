import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Missing</p>
      <h1 className="mt-2 font-display text-5xl">That call is not on the desk.</h1>
      <Link href="/" className="mt-4 inline-block text-sm text-accent">
        Return to Discover
      </Link>
    </div>
  );
}
