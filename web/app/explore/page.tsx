"use client";

import Link from "next/link";
import { BasketCard } from "@/components/basket-card";
import { useBaskets } from "@/lib/baskets";

export default function Explore() {
  const { baskets, error } = useBaskets();
  return (
    <section className="mx-auto max-w-[1400px] px-5 pt-14 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="display text-title text-ivory">Every basket on Tessera</h1>
          <p className="mt-3 max-w-[60ch] text-ivory-dim">
            Read straight from the factory contract. Each one is fully backed by the stock tokens in
            its vault, at live Robinhood prices.
          </p>
        </div>
        <Link href="/compose" className="bg-gold px-5 py-3 text-sm font-medium text-ground-deep">
          Create a basket
        </Link>
      </div>
      {error && <p className="mt-8 border border-loss/40 p-4 text-sm text-ivory">Could not read the factory: {error}</p>}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {baskets
          ? baskets.map((b) => <BasketCard key={b.address} basket={b} />)
          : Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-[270px] border border-rule" />)}
      </div>
      {baskets && baskets.length === 0 && (
        <p className="mt-10 border border-dashed border-rule-bright p-8 text-center text-ivory-dim">
          No baskets yet. Create the first one.
        </p>
      )}
    </section>
  );
}
