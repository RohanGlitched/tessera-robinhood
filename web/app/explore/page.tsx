"use client";

import Link from "next/link";
import { BasketCard } from "@/components/basket-card";
import { usePrices } from "@/components/prices";
import { featuredOrder, useBaskets, vaultValue } from "@/lib/baskets";
import { DEPLOYMENT } from "@/lib/chain";
import { moneyCompact } from "@/lib/format";
import { MosaicBand } from "@/components/mosaic-band";

export default function Explore() {
  const { baskets, error } = useBaskets();
  const { prices } = usePrices();
  const tvl = baskets?.reduce((a, b) => a + (vaultValue(b, prices) ?? 0), 0) ?? null;
  const seeds = new Set(DEPLOYMENT.baskets.map((b) => b.address.toLowerCase()));
  const ordered = baskets ? featuredOrder(baskets, prices) : null;
  const featured = ordered?.filter((b) => seeds.has(b.address.toLowerCase())) ?? null;
  const community = ordered?.filter((b) => !seeds.has(b.address.toLowerCase())) ?? null;
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
      <MosaicBand className="mt-10" />
      <div className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="display text-2xl text-ivory">Featured</h2>
          <p className="text-sm text-ivory-faint">Published at launch, sized at $10 a share from live quotes.</p>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured
            ? featured.map((b) => <BasketCard key={b.address} basket={b} />)
            : Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-[270px] border border-rule" />)}
        </div>
      </div>
      <div className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="display text-2xl text-ivory">Published by the community</h2>
          <p className="tnum text-sm text-ivory-faint">{community ? `${community.length} ${community.length === 1 ? "basket" : "baskets"}` : "—"}</p>
        </div>
        <p className="mt-2 max-w-[60ch] text-sm text-ivory-dim">
          Anyone who publishes a recipe through the factory appears here, test runs included. Judge a basket by its vault and its creator, not its name.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {community
            ? community.map((b) => <BasketCard key={b.address} basket={b} />)
            : Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-[270px] border border-rule" />)}
        </div>
        {community && community.length === 0 && (
          <p className="mt-6 border border-dashed border-rule-bright p-8 text-center text-ivory-dim">
            Nobody has published a basket yet. Yours could be the first.
          </p>
        )}
      </div>
    </section>
  );
}
