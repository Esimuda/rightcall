"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Discover" },
  { href: "/sources", label: "Sources" },
  { href: "/memory", label: "Memory" },
  { href: "/docs", label: "Docs" },
];

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="h-1 bg-accent" />
      <header className="sticky top-0 z-30 border-b border-line bg-ink/92 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-6 px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="mark" aria-hidden />
            <span className="font-display text-[1.65rem] leading-none tracking-tight">RightCall</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 text-[11px] uppercase tracking-[0.16em]",
                  active(pathname, link.href) ? "text-accent" : "text-muted hover:text-text",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="ml-auto hidden text-[11px] uppercase tracking-[0.16em] text-muted sm:block">
            Namespace rightcall
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-ink md:hidden"
        aria-label="Mobile"
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "py-3 text-center text-[10px] uppercase tracking-[0.14em]",
              active(pathname, link.href) ? "text-accent" : "text-muted",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
