"use client";

import { Mosaic } from "./mosaic";
import { slotColor } from "@/lib/palette";
import { percent } from "@/lib/format";

export type BasketTile = {
  key: string;
  /** Ticker, e.g. "TSLA". */
  label: string;
  /** Company name, drawn only when a tile is large enough to hold it. */
  sub?: string;
  weightBps: number;
  /** Palette slot. Fixed per component so a weight change never repaints. */
  slot: number;
};

/**
 * The basket as it stands: one tessera per component, area exactly its weight.
 * Colour is identity, pinned to the component, so a weight change resizes tiles
 * without repainting them.
 */
export function BasketMosaic({
  tiles,
  height = 260,
  onRemove,
  emptyHint,
}: {
  tiles: BasketTile[];
  height?: number;
  onRemove?: (key: string) => void;
  emptyHint?: string;
}) {
  return (
    <Mosaic
      height={height}
      emptyHint={emptyHint}
      onTile={onRemove}
      ariaLabel={`Basket composition: ${tiles.map((t) => `${t.label} ${percent(t.weightBps / 100, 1)}`).join(", ")}`}
      tiles={tiles.map((t) => ({
        key: t.key,
        value: t.weightBps,
        color: slotColor(t.slot),
        label: t.label,
        figure: percent(t.weightBps / 100, t.weightBps % 100 === 0 ? 0 : 1),
        sub: t.sub,
        mark: t.label,
      }))}
    />
  );
}
