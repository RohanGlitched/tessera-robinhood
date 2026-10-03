"use client";

import { usePrices } from "./prices";
import { BrandMark } from "./brand-mark";
import { STOCKS } from "@/lib/tokens";
import { money, signedPercent } from "@/lib/format";
import { changeInk } from "@/lib/palette";

/** A slow strip of live quotes under the header. Still under reduced motion. */
export function TickerTape() {
  const { prices } = usePrices();
  const items = STOCKS.map((s) => ({ s, p: prices[s.symbol] }));
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden}>
      {items.map(({ s, p }) => (
        <li key={s.symbol} className="flex items-center gap-2 whitespace-nowrap text-[13px]">
          <BrandMark symbol={s.symbol} className="size-3.5 text-ivory-dim" />
          <span className="text-ivory">{s.symbol}</span>
          <span className="tnum text-ivory-dim">{p ? money(p.mid) : "—"}</span>
          <span className="tnum" style={{ color: changeInk(p?.change24h) }}>
            {p ? signedPercent(p.change24h) : ""}
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="tape relative overflow-hidden border-b border-rule bg-ground-deep py-2.5">
      <div className="tape-track flex w-max">
        {row(false)}
        {row(true)}
        {row(true)}
        {row(true)}
      </div>
    </div>
  );
}
