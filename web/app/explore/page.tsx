"use client";

import Link from "next/link";
import { BasketCard } from "@/components/basket-card";
import { usePrices } from "@/components/prices";
import { featuredOrder, useBaskets, vaultValue } from "@/lib/baskets";
import { moneyCompact } from "@/lib/format";

export default function Explore() {
  const { baskets, error } = useBaskets();
  const { prices } = usePrices();
  const tvl = baskets?.reduce((a, b) => a + (vaultValue(b, prices) ?? 0), 0) ?? null;
  return (
    <section className="mx-auto max-w-[1400px] px-5 pt-14 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="display text-hero text-ivory">Every basket</h1>
          <p className="mt-3 max-w-[60ch] text-[1.05rem] text-ivory-dim">
            Read straight from the factory contract. Nothing here is listed or approved: if someone
            published it on Robinhood Chain, it is on this page.
          </p>
        </div>
        <dl className="flex gap-10">
          <div>
            <dt className="text-xs text-ivory-faint">Baskets</dt>
            <dd className="tnum display mt-1 text-2xl text-ivory">{baskets ? baskets.length : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-ivory-faint">In vaults</dt>
            <dd className="tnum display mt-1 text-2xl text-ivory">{tvl == null ? "—" : moneyCompact(tvl)}</dd>
          </div>
          <Link href="/compose" className="self-center bg-gold px-5 py-3 text-sm font-medium text-ground-deep">
            Create a basket
          </Link>
        </dl>
      </div>
      {error && <p className="mt-8 border border-loss/40 p-4 text-sm text-ivory">Could not read the factory: {error}</p>}
      <div className="mt-10 grid gap-5 border-t border-rule pt-10 sm:grid-cols-2 lg:grid-cols-3">
        {baskets
          ? featuredOrder(baskets, prices)
              
              .map((b) => <BasketCard key={b.address} basket={b} />)
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
