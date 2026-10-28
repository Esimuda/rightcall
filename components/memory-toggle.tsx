import Link from "next/link";
import { cn } from "@/lib/utils";

export function MemoryToggle({ on }: { on: boolean }) {
  return (
    <div className="inline-flex border border-line text-[11px] uppercase tracking-[0.14em]" role="group" aria-label="Memory">
      <Link
        href="?memory=1"
        className={cn("px-3 py-2", on ? "bg-accent text-ink" : "text-muted hover:text-text")}
        aria-current={on ? "page" : undefined}
      >
        Memory on
      </Link>
      <Link
        href="?memory=0"
        className={cn("px-3 py-2", !on ? "bg-text text-ink" : "text-muted hover:text-text")}
        aria-current={!on ? "page" : undefined}
      >
        Memory off
      </Link>
    </div>
  );
}
