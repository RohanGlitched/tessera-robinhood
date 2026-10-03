"use client";

import { use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Address } from "viem";
import { BasketMosaic } from "@/components/basket-mosaic";
import { basketTiles } from "@/components/basket-card";
import { BasketActions } from "@/components/basket-actions";
import { OrdersTable } from "@/components/orders-table";
import { usePrices } from "@/components/prices";
import { useWallet } from "@/components/wallet";
import { navChange24h, navPerShare, tokenAmount, useBalances, useBasket, useOrders, vaultValue, ONE_SHARE } from "@/lib/baskets";
import { explorerAddress } from "@/lib/chain";
import { money, moneyCompact, percent, quantity, shortAddress, signedPercent, timeAgo } from "@/lib/format";
import { slotColor, changeInk } from "@/lib/palette";
import { BrandMark } from "@/components/brand-mark";
import { Ticker } from "@/components/ticker";

export default function BasketPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const created = useSearchParams().get("created");
  const w = useWallet();
  const { prices } = usePrices();
  const { basket, error } = useBasket(address as Address, w.nonce);
  const orders = useOrders(address as Address, w.nonce);
  const mine = useBalances([address as Address], w.address, w.nonce)[address.toLowerCase()] ?? 0n;

  if (error) {
    return (
      <section className="mx-auto max-w-[1400px] px-5 pt-20 sm:px-8">
        <h1 className="display text-title text-ivory">Basket not found</h1>
        <p className="mt-3 text-ivory-dim">{error}</p>
        <Link href="/explore" className="mt-6 inline-block text-gold">
          Back to all baskets
        </Link>
      </section>
    );
  }
  if (!basket) {
    return (
      <section className="mx-auto grid max-w-[1400px] gap-10 px-5 pt-14 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="skeleton h-[520px] border border-rule" />
        <div className="skeleton h-[420px] border border-rule" />
      </section>
    );
  }

  const nav = navPerShare(basket, prices);
  const move = navChange24h(basket, prices);
  const tvl = vaultValue(basket, prices);
  const owed = basket.components.map((c) => (c.unitsPerShare * basket.totalSupply) / ONE_SHARE);
  const coverage = basket.components.map((_, i) => (owed[i] === 0n ? null : Number((basket.vault[i] * 10_000n) / owed[i]) / 100));
  const minCoverage = coverage.every((c) => c === null) ? null : Math.min(...coverage.filter((c): c is number => c !== null));

  return (
    <>
      <section className="mx-auto max-w-[1400px] px-5 pt-12 sm:px-8">
        {created && (
          <p className="mb-6 border border-gain/40 bg-ground-raised px-4 py-3 text-sm text-ivory">
            Your basket is live on Robinhood Chain. Mint the first shares below, or share this page.
          </p>
        )}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-ivory-faint">
              ${basket.symbol} · created {timeAgo(basket.createdAt)} by{" "}
              <a href={explorerAddress(basket.creator)} target="_blank" rel="noreferrer" className="tnum hover:text-ivory">
                {shortAddress(basket.creator, 6, 4)}
              </a>
            </p>
            <h1 className="display mt-2 text-hero text-ivory">{basket.name}</h1>
          </div>
          <dl className="grid w-full grid-cols-3 gap-x-6 gap-y-4 sm:w-auto sm:grid-cols-5 sm:gap-x-10">
            {[
              ["One share", money(nav)],
              ["Today", signedPercent(move)],
              ["In the vault", moneyCompact(tvl)],
              ["Shares out", quantity(tokenAmount(basket.totalSupply), 4)],
              ["You hold", w.address ? quantity(tokenAmount(mine), 4) : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-ivory-faint">{k}</dt>
                <dd className="tnum display mt-1 text-xl text-ivory sm:text-2xl" style={k === "Today" ? { color: changeInk(move) } : undefined}>
                  <Ticker value={v} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-[1400px] gap-x-10 gap-y-8 px-5 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <BasketMosaic tiles={basketTiles(basket)} height={380} />
        </div>

        <aside className="min-w-0 lg:sticky lg:top-32 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <BasketActions basket={basket} />
        </aside>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm sm:min-w-[680px]">
              <thead>
                <tr className="text-left text-xs text-ivory-faint">
                  <th className="pb-2 font-normal">Stock</th>
                  <th className="pb-2 text-right font-normal">Weight</th>
                  <th className="hidden pb-2 text-right font-normal sm:table-cell">Per share</th>
                  <th className="hidden pb-2 text-right font-normal sm:table-cell">Price</th>
                  <th className="pb-2 text-right font-normal">24h</th>
                  <th className="hidden pb-2 text-right font-normal sm:table-cell">In the vault</th>
                  <th className="pb-2 text-right font-normal">Backing</th>
                </tr>
              </thead>
              <tbody>
                {basket.components.map((c, i) => {
                  const p = c.stock && prices[c.stock.symbol];
                  return (
                    <tr key={c.token} className="border-t border-rule">
                      <td className="py-2.5">
                        <a href={explorerAddress(c.token)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-ivory hover:text-gold">
                          <span className="size-2.5" style={{ background: slotColor(i) }} aria-hidden />
                          <BrandMark symbol={c.stock?.symbol ?? ""} className="size-3.5 text-ivory-dim" />
                          {c.stock?.symbol}
                          <span className="hidden text-ivory-faint sm:inline">{c.stock?.name}</span>
                        </a>
                      </td>
                      <td className="tnum py-2.5 text-right text-ivory-dim">{percent(c.weightBps / 100, 2)}</td>
                      <td className="tnum hidden py-2.5 text-right text-ivory-dim sm:table-cell">{quantity(tokenAmount(c.unitsPerShare), 6)}</td>
                      <td className="tnum hidden py-2.5 text-right text-ivory-dim sm:table-cell">{p ? money(p.mid) : "—"}</td>
                      <td className="tnum py-2.5 text-right" style={{ color: changeInk(p?.change24h) }}>{p ? signedPercent(p.change24h) : "—"}</td>
                      <td className="tnum hidden py-2.5 text-right text-ivory sm:table-cell">{quantity(tokenAmount(basket.vault[i]), 5)}</td>
                      <td className="tnum py-2.5 text-right text-ivory-dim">{coverage[i] === null ? "—" : percent(coverage[i], 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-6 grid gap-px border border-rule bg-rule sm:grid-cols-3">
            {[
              ["Backing", minCoverage === null ? "No shares yet" : `${percent(Math.min(minCoverage, 999.99), 2)} of every share`],
              ["Mints and redemptions", `${basket.mintCount} and ${basket.redeemCount}`],
              ["Creator fee", `${percent(basket.feeBps / 100, 2)} in new shares`],
            ].map(([k, v]) => (
              <div key={k} className="bg-ground-deep p-4">
                <p className="text-xs text-ivory-faint">{k}</p>
                <p className="tnum mt-1 text-ivory">{v}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ivory-faint">
            Backing is read live from the vault: what it holds of each stock, divided by what all
            outstanding shares can claim. Deposits round up and redemptions round down, so it never
            falls below 100%.{" "}
            <a href={explorerAddress(basket.address)} target="_blank" rel="noreferrer" className="underline decoration-rule-bright underline-offset-4 hover:text-ivory">
              See the vault on the explorer
            </a>
          </p>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-[1400px] px-5 sm:px-8">
        <h2 className="display text-title text-ivory">Creation desk for ${basket.symbol}</h2>
        <p className="mt-2 max-w-[64ch] text-sm text-ivory-dim">
          USDG orders waiting for someone to deliver the stocks. Fill one to earn its premium: the
          desk takes your stock tokens, the vault mints the buyer&apos;s shares, and you receive the
          USDG.
        </p>
        <div className="mt-6">
          <OrdersTable orders={orders} baskets={{ [basket.address.toLowerCase()]: basket }} emptyText="No USDG orders for this basket yet. Place one from the Buy with USDG tab." />
        </div>
      </section>
    </>
  );
}
