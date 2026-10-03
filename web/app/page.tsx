"use client";

import Link from "next/link";
import { BasketMosaic } from "@/components/basket-mosaic";
import { BasketCard, basketTiles } from "@/components/basket-card";
import { usePrices } from "@/components/prices";
import { navPerShare, useBaskets } from "@/lib/baskets";
import { STOCKS } from "@/lib/tokens";
import { money, quantity } from "@/lib/format";
import { tokenAmount } from "@/lib/baskets";

export default function Home() {
  const { baskets } = useBaskets();
  const { prices } = usePrices();
  const flagship = baskets?.find((b) => b.symbol === "HOOD5") ?? baskets?.[baskets.length - 1];

  return (
    <>
      <section className="mx-auto grid max-w-[1400px] gap-12 px-5 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div className="min-w-0">
          <p className="rise inline-flex items-center gap-2 border border-rule-bright px-3 py-1.5 text-xs text-ivory-dim" style={{ "--i": 0 } as React.CSSProperties}>
            <span className="live-dot size-1.5 rounded-full bg-gain" aria-hidden />
            Live on Robinhood Chain testnet, priced by Robinhood
          </p>
          <h1 className="display rise mt-7 text-hero text-ivory" style={{ "--i": 1 } as React.CSSProperties}>
            An index fund is a list of companies and a set of weights.
          </h1>
          <p className="rise mt-7 max-w-[56ch] text-[1.06rem] leading-relaxed text-ivory-dim" style={{ "--i": 2 } as React.CSSProperties}>
            Tessera turns Robinhood Stock Tokens into baskets anyone can launch. Pick up to eight
            stocks, set the weights and publish them as one token. Every share is backed by the
            real stock tokens in a vault on Robinhood Chain and can be redeemed for them at any
            time. No stock tokens yet? Buy any basket with USDG through the open creation desk.
          </p>
          <div className="rise mt-9 flex flex-wrap gap-3" style={{ "--i": 3 } as React.CSSProperties}>
            <Link href="/compose" className="bg-gold px-5 py-3 text-sm font-medium text-ground-deep hover:brightness-110">
              Create a basket
            </Link>
            <Link href="/explore" className="border border-rule-bright px-5 py-3 text-sm text-ivory hover:border-ivory-faint">
              Explore baskets
            </Link>
          </div>
          <p className="rise mt-8 max-w-[60ch] text-sm leading-relaxed text-ivory-faint" style={{ "--i": 4 } as React.CSSProperties}>
            Nothing is priced by an oracle. A share is created by handing the vault the exact stock
            tokens its recipe names, and redeemed by taking them back.
          </p>
        </div>

        <div className="rise min-w-0" style={{ "--i": 2 } as React.CSSProperties}>
          {flagship ? (
            <Link href={`/basket/${flagship.address}`} className="block border border-rule bg-ground p-5 hover:border-rule-bright">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="display text-2xl text-ivory">{flagship.name}</p>
                  <p className="text-sm text-ivory-faint">${flagship.symbol}, one share</p>
                </div>
                <p className="tnum display text-3xl text-ivory">{money(navPerShare(flagship, prices))}</p>
              </div>
              <div className="mt-5">
                <BasketMosaic tiles={basketTiles(flagship)} height={300} />
              </div>
              <table className="mt-5 w-full text-sm">
                <tbody>
                  {flagship.components.map((c) => {
                    const p = c.stock && prices[c.stock.symbol];
                    const units = tokenAmount(c.unitsPerShare);
                    return (
                      <tr key={c.token} className="border-t border-rule">
                        <td className="py-2 text-ivory">{c.stock?.symbol}</td>
                        <td className="tnum py-2 text-right text-ivory-dim">{quantity(units, 5)} tokens</td>
                        <td className="tnum py-2 text-right text-ivory-dim">{p ? money(p.mid) : "—"}</td>
                        <td className="tnum py-2 text-right text-ivory">{p ? money(units * p.mid) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Link>
          ) : (
            <div className="skeleton h-[480px] border border-rule" />
          )}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-[1400px] px-5 sm:px-8">
        <div className="flex items-end justify-between gap-6">
          <h2 className="display text-title text-ivory">Baskets on Robinhood Chain</h2>
          <Link href="/explore" className="text-sm text-ivory-dim hover:text-ivory">
            See all
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {baskets
            ? baskets.slice(0, 6).map((b) => <BasketCard key={b.address} basket={b} />)
            : Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-[270px] border border-rule" />)}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-[1400px] px-5 sm:px-8">
        <h2 className="display text-title text-ivory">Three ways in, one vault</h2>
        <ol className="mt-10 grid gap-px border border-rule bg-rule md:grid-cols-3">
          {[
            ["Compose", "Pick up to eight Robinhood Stock Tokens and their weights. Tessera writes the recipe on chain once, and it can never be edited."],
            ["Mint in kind", "Hand the vault the exact tokens one share needs and receive the share. Burn it any time to take the tokens back, pro rata."],
            ["Buy with USDG", "Post a USDG order on the creation desk. Anyone holding the stocks fills it, the vault mints your shares and they collect the USDG."],
          ].map(([t, d], i) => (
            <li key={t} className="bg-ground-deep p-6 sm:p-8">
              <span className="tnum text-sm text-gold">{i + 1}</span>
              <h3 className="display mt-3 text-2xl text-ivory">{t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ivory-dim">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-24 max-w-[1400px] px-5 sm:px-8">
        <h2 className="display text-title text-ivory">The stocks you can use today</h2>
        <div className="mt-8 grid gap-px border border-rule bg-rule sm:grid-cols-5">
          {STOCKS.map((s) => {
            const p = prices[s.symbol];
            return (
              <div key={s.symbol} className="bg-ground-deep p-5">
                <p className="text-sm text-ivory">{s.symbol}</p>
                <p className="tnum display mt-2 text-2xl text-ivory">{p ? money(p.mid) : "—"}</p>
                <p className="mt-2 text-xs leading-relaxed text-ivory-faint">{s.blurb}</p>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
