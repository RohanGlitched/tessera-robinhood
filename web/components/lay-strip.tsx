"use client";

import { slotColor } from "@/lib/palette";

export type LayState = "idle" | "busy" | "done";

/**
 * Laying a tessera. The stocks the recipe names sit on the left as small
 * stones; the share sits on the right as one gold tile. While a mint or a
 * fill is in flight the stones travel into the share; while a redemption is in
 * flight they travel back out. When the transaction lands, the share sets.
 *
 * It is the whole idea of the product in one line: a share is made of stocks.
 */
export function LayStrip({
  symbols,
  symbol,
  direction,
  state,
}: {
  symbols: string[];
  symbol: string;
  /** "in": stocks become a share. "out": a share becomes stocks. */
  direction: "in" | "out";
  state: LayState;
}) {
  const n = symbols.length;
  // How far a stone travels to reach the share: the gap plus the stones after it.
  const dist = (i: number) => `${(n - 1 - i) * 18 + 84}px`;
  const caption =
    state === "busy"
      ? direction === "in"
        ? `Stocks are going into the vault, a share of ${symbol} is coming out`
        : `${symbol} is being burned, the stocks are coming back out`
      : direction === "in"
        ? `${n} ${n === 1 ? "stock goes" : "stocks go"} in, one ${symbol} share comes out`
        : `One ${symbol} share goes in, ${n} ${n === 1 ? "stock comes" : "stocks come"} out`;

  return (
    <figure className="lay-strip flex items-center gap-4" data-state={state} data-dir={direction} aria-label={caption}>
      <div className="flex items-center" style={{ gap: 6 }}>
        {symbols.map((s, i) => (
          <span
            key={s}
            title={s}
            className="lay-chip block size-3"
            style={{ background: slotColor(i), "--i": i, "--dist": dist(i) } as React.CSSProperties}
          />
        ))}
      </div>
      <span className="h-px w-10 shrink-0 bg-rule-bright" aria-hidden />
      <span className="lay-share tnum flex h-9 w-11 shrink-0 items-center justify-center bg-gold px-1 text-[9px] font-semibold tracking-wide text-ground-deep">
        {symbol.length > 5 ? symbol.slice(0, 5) : symbol}
      </span>
      <figcaption className="min-w-0 flex-1 text-xs leading-snug text-ivory-faint">{caption}</figcaption>
    </figure>
  );
}
