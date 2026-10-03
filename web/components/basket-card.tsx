"use client";

import Link from "next/link";
import { BasketMosaic } from "./basket-mosaic";
import { usePrices } from "./prices";
import { Ticker } from "./ticker";
import { navChange24h, navPerShare, tokenAmount, vaultValue, type BasketInfo } from "@/lib/baskets";
import { money, moneyCompact, percent, quantity, shortAddress, signedPercent } from "@/lib/format";
import { changeInk } from "@/lib/palette";

export function basketTiles(b: BasketInfo) {
  return b.components.map((c, i) => ({
    key: c.token,
    label: c.stock?.symbol ?? "?",
    sub: c.stock?.name,
    weightBps: c.weightBps,
    slot: i,
  }));
}

export function BasketCard({ basket, height = 168 }: { basket: BasketInfo; height?: number }) {
  const { prices } = usePrices();
  const nav = navPerShare(basket, prices);
  const move = navChange24h(basket, prices);
  const tvl = vaultValue(basket, prices);
  return (
    <Link href={`/basket/${basket.address}`} className="lift group block border border-rule bg-ground hover:border-rule-bright">
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0">
          <h3 className="display truncate text-[1.6rem] text-ivory group-hover:text-gold">{basket.name}</h3>
          <p className="mt-1 text-[13px] text-ivory-faint">
            ${basket.symbol} · {basket.components.length} stocks · by {shortAddress(basket.creator, 4, 4)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tnum display text-[1.6rem] text-ivory">
            <Ticker value={money(nav)} />
          </p>
          <p className="tnum text-[13px]" style={{ color: changeInk(move) }}>
            {signedPercent(move)} today
          </p>
        </div>
      </div>
      <div className="px-5 pt-4">
        <BasketMosaic tiles={basketTiles(basket)} height={height} />
      </div>
      <dl className="mt-5 grid grid-cols-3 border-t border-rule text-[13px]">
        {[
          ["Creator fee", percent(basket.feeBps / 100, 2)],
          ["Shares out", quantity(tokenAmount(basket.totalSupply), 2)],
          ["In the vault", moneyCompact(tvl)],
        ].map(([k, v]) => (
          <div key={k} className="border-r border-rule px-5 py-3.5 last:border-r-0">
            <dt className="text-ivory-faint">{k}</dt>
            <dd className="tnum mt-0.5 text-ivory">{v}</dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}
