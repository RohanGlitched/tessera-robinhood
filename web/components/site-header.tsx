"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./mark";
import { ConnectButton } from "./connect-button";

const NAV = [
  { href: "/compose", label: "Create", short: "Create" },
  { href: "/explore", label: "Explore", short: "Explore" },
  { href: "/desk", label: "Creation desk", short: "Desk" },
  { href: "/method", label: "How it works", short: "Method" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b border-rule bg-ground-deep/85 backdrop-blur-md sm:sticky sm:top-0 sm:z-40">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Wordmark />
          <span className="hidden border-l border-rule-bright pl-3 text-xs text-ivory-dim lg:inline">
            on Robinhood Chain
          </span>
        </Link>
        <nav className="ml-2 hidden items-center gap-1 sm:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  active ? "text-ivory" : "text-ivory-dim hover:text-ivory"
                }`}
              >
                {item.label}
                {active && <span className="mt-1 block h-px bg-gold" aria-hidden />}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto">
          <ConnectButton />
        </div>
      </div>
      <nav className="flex border-t border-rule text-sm sm:hidden">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 border-r border-rule py-3 text-center last:border-r-0 ${
                active ? "bg-ground-raised text-ivory" : "text-ivory-dim"
              }`}
            >
              {item.short}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
