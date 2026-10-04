"use client";

import Link from "next/link";
import { BasketCard } from "@/components/basket-card";
import { MarketMosaic } from "@/components/market-mosaic";
import { MarketClock } from "@/components/market-clock";
import { FlowDiagram } from "@/components/flow-diagram";
import { usePrices } from "@/components/prices";
import { Ticker } from "@/components/ticker";
import { QuickStart } from "@/components/quick-start";
import { featuredOrder, useBaskets, vaultValue } from "@/lib/baskets";
import { moneyCompact } from "@/lib/format";

const rise = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default function Home() {
  const { baskets } = useBaskets();
  const { prices } = usePrices();
  const tvl = baskets?.reduce((a, b) => a + (vaultValue(b, prices) ?? 0), 0) ?? null;

  return (
    <>
      <section className="mx-auto grid max-w-[1400px] items-start gap-12 px-5 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[0.82fr_1fr] lg:gap-14">
        <div className="min-w-0 lg:pt-6">
          <p className="rise inline-flex items-center gap-2 border border-rule-bright px-3 py-1.5 text-xs text-ivory-dim" style={rise(0)}>
            <span className="live-dot size-1.5 rounded-full bg-gain" aria-hidden />
            Live on Robinhood Chain testnet
          </p>
          <h1 className="display rise mt-7 text-[clamp(2.6rem,5.2vw,4.6rem)] text-ivory" style={rise(1)}>
            An index fund is a list of companies and a set of weights.
          </h1>
          <p className="rise mt-6 max-w-[52ch] text-[1.07rem] leading-relaxed text-ivory-dim" style={rise(2)}>
            Tessera turns Robinhood Stock Tokens into baskets anyone can launch. Pick up to eight
            stocks (five are live on the testnet today), set the weights, and publish them as one token, backed share for share by the
            real stock tokens in a vault on Robinhood Chain. No stock tokens? Buy any basket with
            USDG.
          </p>
          <div className="rise mt-8 flex flex-wrap items-stretch gap-3" style={rise(3)}>
            <QuickStart />
            <Link href="/compose" className="inline-flex items-center bg-gold px-5 py-3 text-sm font-medium text-ground-deep hover:brightness-110">
              Create a basket
            </Link>
            <Link href="/explore" className="inline-flex items-center border border-rule-bright px-5 py-3 text-sm text-ivory hover:border-ivory-faint">
              Explore baskets
            </Link>
          </div>
          <dl className="rise mt-10 grid max-w-md grid-cols-3 border-t border-rule pt-5" style={rise(4)}>
            {[
              ["Baskets", baskets ? String(baskets.length) : "—"],
              ["In vaults", tvl == null ? "—" : moneyCompact(tvl)],
              ["Oracles", "None"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-ivory-faint">{k}</dt>
                <dd className="tnum display mt-1 text-2xl text-ivory">
                  <Ticker value={v} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rise min-w-0" style={rise(2)}>
          <MarketMosaic height={430} />
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-[1400px] px-5 sm:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="display text-title text-ivory">Baskets on Robinhood Chain</h2>
            <p className="mt-2 text-ivory-dim">Read from the factory contract. Valued at live Robinhood quotes.</p>
          </div>
          <Link href="/explore" className="shrink-0 text-sm text-ivory-dim hover:text-ivory">
            See all baskets
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {baskets
            ? featuredOrder(baskets, prices)
                .filter((b) => b.totalSupply > 0n)
                
                .slice(0, 3)
                .map((b) => <BasketCard key={b.address} basket={b} />)
            : Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-[330px] border border-rule" />)}
        </div>
      </section>

      <section className="mx-auto mt-28 max-w-[1400px] px-5 sm:px-8">
        <h2 className="display text-title text-ivory">How a share is made</h2>
        <p className="mt-2 max-w-[62ch] text-ivory-dim">
          Two ways in, one vault. Every rule below is enforced by three small contracts, and none of
          them reads a price.
        </p>
        <div className="mt-10 border border-rule bg-ground px-4 py-8 sm:px-8">
          <FlowDiagram />
        </div>
      </section>

      <section className="mx-auto mt-28 grid max-w-[1400px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h2 className="display text-title text-ivory">The exchange keeps hours. The chain does not.</h2>
          <p className="mt-3 max-w-[54ch] leading-relaxed text-ivory-dim">
            Robinhood Stock Tokens track companies that trade on the NYSE, but they settle on
            Robinhood Chain around the clock. A Tessera basket can be created or redeemed on a
            Sunday night, in kind, at whatever the vault holds.
          </p>
        </div>
        <MarketClock />
      </section>
    </>
  );
}
