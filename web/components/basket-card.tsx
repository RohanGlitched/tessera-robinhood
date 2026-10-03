"use client";

import Link from "next/link";
import { BasketMosaic } from "./basket-mosaic";
import { usePrices } from "./prices";
import { navPerShare, tokenAmount, vaultValue, type BasketInfo } from "@/lib/baskets";
import { money, moneyCompact, percent, quantity } from "@/lib/format";

export function basketTiles(b: BasketInfo) {
  return b.components.map((c, i) => ({
    key: c.token,
    label: c.stock?.symbol ?? "?",
    sub: c.stock?.name,
    weightBps: c.weightBps,
    slot: i,
  }));
}

export function BasketCard({ basket }: { basket: BasketInfo }) {
  const { prices } = usePrices();
  const nav = navPerShare(basket, prices);
  const tvl = vaultValue(basket, prices);
  return (
    <Link
      href={`/basket/${basket.address}`}
      className="lift group block border border-rule bg-ground p-4 hover:border-rule-bright"
    >
      <BasketMosaic tiles={basketTiles(basket)} height={150} />
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <h3 className="display truncate text-[1.55rem] text-ivory">{basket.name}</h3>
          <p className="text-sm text-ivory-faint">
            ${basket.symbol} · {basket.components.length} stocks · fee {percent(basket.feeBps / 100, 2)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tnum text-lg text-ivory">{money(nav)}</p>
          <p className="text-xs text-ivory-faint">per share</p>
        </div>
      </div>
      <div className="mt-3 flex justify-between border-t border-rule pt-3 text-xs text-ivory-dim">
        <span className="tnum">{quantity(tokenAmount(basket.totalSupply), 4)} shares</span>
        <span className="tnum">{moneyCompact(tvl)} in vault</span>
      </div>
    </Link>
  );
}
