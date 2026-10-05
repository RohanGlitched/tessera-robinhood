"use client";

import { Mosaic } from "./mosaic";
import { useMeasure } from "@/lib/use-measure";
import { usePrices } from "./prices";
import { Ticker } from "./ticker";
import { STOCKS } from "@/lib/tokens";
import { CHANGE_LEGEND, changeColor } from "@/lib/palette";
import { money, moneyCompact, signedPercent } from "@/lib/format";

/**
 * Every Robinhood Stock Token on the testnet, laid as a mosaic: area is the
 * company's market value, colour is its move over the last 24 hours.
 */
/** `fill`: stretch to the parent's height (a flex column), never below `height`. */
export function MarketMosaic({ height = 420, fill = false }: { height?: number; fill?: boolean }) {
  const { ref: box, height: boxHeight } = useMeasure<HTMLDivElement>();
  const mosaicHeight = fill ? Math.max(Math.floor(boxHeight), height) : height;
  const { prices, updatedAt } = usePrices();
  const ready = STOCKS.every((s) => prices[s.symbol]);
  const total = STOCKS.reduce((a, s) => a + (prices[s.symbol]?.mcap ?? 0), 0);
  const at = prices.TSLA?.at ? new Date(prices.TSLA.at) : null;
  const asOf =
    at && !Number.isNaN(at.getTime())
      ? `as of ${at.toLocaleString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" })} ET`
      : null;

  return (
    <figure className={fill ? "flex flex-1 flex-col" : undefined}>
      <figcaption className="flex min-h-9 flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <span className="display text-[1.35rem] leading-none text-ivory">Robinhood Stock Tokens, live</span>
        <span className="text-sm text-ivory-faint">Area is company value. Colour is the move since the last close.</span>
      </figcaption>
      {/* With `fill` the mosaic is laid inside an absolutely positioned box, so its own height never feeds back
          into the row height: the copy column decides the row, and the mosaic fills what is left. */}
      <div ref={box} className={fill ? "relative mt-4 flex-1" : "mt-4"} style={fill ? { minHeight: height } : undefined}>
        <div className={fill ? "absolute inset-0" : undefined}>
          {ready ? (
            <Mosaic
              height={mosaicHeight}
              gap={4}
              ariaLabel={STOCKS.map((s) => `${s.symbol} ${money(prices[s.symbol]?.mid)} ${signedPercent(prices[s.symbol]?.change24h)}`).join(", ")}
              tiles={STOCKS.map((s) => {
                const p = prices[s.symbol]!;
                return {
                  key: s.symbol,
                  value: p.mcap ?? 1,
                  color: changeColor(p.change24h),
                  label: s.symbol,
                  figure: money(p.mid),
                  sub: `${signedPercent(p.change24h)} · ${s.name}`,
                  mark: s.symbol,
                };
              })}
            />
          ) : (
            <div className="skeleton" style={{ height: mosaicHeight }} />
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-ivory-faint">
        <div className="flex items-center gap-1">
          {CHANGE_LEGEND.map((l) => (
            <span key={l.label} title={l.label} className="h-2.5 w-5" style={{ background: l.color }} />
          ))}
          <span className="ml-2">Move since last close, −3% to +3%</span>
        </div>
        <span className="tnum">
          {total ? <Ticker value={`${moneyCompact(total)} of companies`} /> : "—"} · Robinhood quotes
          {asOf ? ` ${asOf}` : updatedAt ? " · live" : ""}
        </span>
      </div>
    </figure>
  );
}
