"use client";

import { useId, useMemo, useRef } from "react";
import { squarify, fitsTile, fitLabel } from "@/lib/treemap";
import { CHART_SURFACE } from "@/lib/palette";
import { useMeasure } from "@/lib/use-measure";
import { BRAND_PATHS } from "@/lib/brands";

export type MosaicTile = {
  key: string;
  /** Area. Weight in bps, market cap, anything positive. */
  value: number;
  color: string;
  /** Ticker, drawn top left. */
  label: string;
  /** The headline figure: a weight or a price move. */
  figure?: string;
  /** Small print at the foot of the tile. */
  sub?: string;
  /** Ticker whose brand mark to inlay in the corner. */
  mark?: string;
  href?: string;
};

/** Dark ink on light stone, ivory on dark stone, by relative luminance. */
function inkFor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.2 ? "#0a1224" : "#f3eee2";
}

/**
 * A mosaic of cut stone. Each tessera carries a faint grain, a lit top edge and
 * a shaded foot, so the grid reads as a laid floor rather than a chart.
 */
export function Mosaic({
  tiles,
  height = 260,
  gap = 3,
  ariaLabel,
  emptyHint = "Pick a stock to lay the first tile.",
  onTile,
}: {
  tiles: MosaicTile[];
  height?: number;
  gap?: number;
  ariaLabel: string;
  emptyHint?: string;
  onTile?: (key: string) => void;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const uid = useId().replace(/:/g, "");
  const lantern = useRef<HTMLDivElement>(null);
  // Stones are laid one by one on the first paint only; later relayouts just move.
  const firstPaint = useRef(true);
  const laidOnce = useRef(false);

  const laid = useMemo(() => {
    if (!width || !tiles.length) return [];
    const map = new Map(tiles.map((t) => [t.key, t]));
    return squarify(
      tiles.map((t) => ({ key: t.key, value: t.value })),
      width,
      height,
      gap,
    ).map((tile) => ({ ...tile, meta: map.get(tile.key)! }));
  }, [tiles, width, height, gap]);

  const staggered = firstPaint.current && !laidOnce.current && laid.length > 0;
  if (laid.length > 0) {
    if (laidOnce.current) firstPaint.current = false;
    laidOnce.current = true;
  }

  return (
    <div
      ref={ref}
      style={{ height }}
      className="mosaic-floor relative"
      onMouseMove={(e) => {
        const el = lantern.current;
        if (!el) return;
        const r = e.currentTarget.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      <div ref={lantern} className="mosaic-lantern" aria-hidden />
      {tiles.length === 0 ? (
        <div
          className="flex h-full items-center justify-center border border-dashed border-rule-bright/60"
          style={{ background: CHART_SURFACE }}
        >
          <p className="max-w-[24ch] text-center text-sm leading-relaxed text-ivory-faint">{emptyHint}</p>
        </div>
      ) : (
        width > 0 && (
          <svg width={width} height={height} role="img" aria-label={ariaLabel} style={{ background: "#070d1b" }}>
            <defs>
              <filter id={`grain-${uid}`} x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch" />
                <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0" />
              </filter>
              <linearGradient id={`shade-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.07" />
                <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
                <stop offset="1" stopColor="#000" stopOpacity="0.14" />
              </linearGradient>
            </defs>
            {laid.map((tile, order) => {
              const m = tile.meta;
              const lay = staggered ? ({ animationDelay: `${order * 70}ms` } as React.CSSProperties) : undefined;
              const ink = inkFor(m.color);
              const big = Math.min(34, Math.max(16, Math.min(tile.width, tile.height) / 4.2));
              // Narrow tiles keep their ticker at a smaller size before giving up on it.
              const wide = tile.height > 30 ? fitLabel(m.label, 15, tile.width, 14) : null;
              const labelSize = wide ? 15 : 11;
              const labelInset = wide ? 14 : 8;
              const label = wide ?? (tile.height > 30 ? fitLabel(m.label, 11, tile.width, 8) : null);
              const figure =
                label && m.figure && tile.height > big + 46 && fitsTile(m.figure, big * 0.86, tile.width, 14)
                  ? m.figure
                  : null;
              const sub =
                figure && m.sub && tile.height > big + 74 && fitsTile(m.sub, 11.5, tile.width, 14) ? m.sub : null;
              const markSize = Math.min(22, tile.width / 5);
              // The mark sits right of the ticker and only where both fit with room between.
              const showMark =
                !!label && !!m.mark && !!BRAND_PATHS[m.mark] && tile.height > 54 &&
                tile.width >= labelInset + label.length * labelSize * 0.68 + 16 + markSize + 12;
              const body = (
                <g className={`mosaic-tile${staggered ? " lay" : ""}`} style={{ cursor: onTile || m.href ? "pointer" : "default", ...lay }} onClick={onTile ? () => onTile(m.key) : undefined}>
                  <title>{[m.label, m.figure, m.sub].filter(Boolean).join(" · ")}</title>
                  <rect x={tile.x} y={tile.y} width={tile.width} height={tile.height} fill={m.color} />
                  <rect x={tile.x} y={tile.y} width={tile.width} height={tile.height} fill="#fff" opacity="0.07" filter={`url(#grain-${uid})`} style={{ mixBlendMode: "overlay" }} />
                  <rect x={tile.x} y={tile.y} width={tile.width} height={tile.height} fill={`url(#shade-${uid})`} />
                  <rect x={tile.x} y={tile.y} width={tile.width} height={1} fill="#fff" opacity="0.28" />
                  {label && (
                    <text x={tile.x + labelInset} y={tile.y + 10 + labelSize} fill={ink} fontSize={labelSize} fontWeight={600} letterSpacing="0.02em" pointerEvents="none">
                      {label}
                    </text>
                  )}
                  {showMark && (
                    <svg
                      x={tile.x + tile.width - markSize - 12}
                      y={tile.y + 11}
                      width={markSize}
                      height={markSize}
                      viewBox="0 0 24 24"
                      pointerEvents="none"
                    >
                      <path d={BRAND_PATHS[m.mark!]} fill={ink} fillOpacity={0.62} />
                    </svg>
                  )}
                  {figure && (
                    <text
                      x={tile.x + 14}
                      y={tile.y + tile.height - (sub ? 34 : 16)}
                      fill={ink}
                      fontSize={big}
                      className="tnum"
                      style={{ fontFamily: "var(--font-fraunces), Georgia, serif", letterSpacing: "-0.02em" }}
                      pointerEvents="none"
                    >
                      {figure}
                    </text>
                  )}
                  {sub && (
                    <text x={tile.x + 14} y={tile.y + tile.height - 14} fill={ink} fillOpacity={0.7} fontSize={11.5} pointerEvents="none">
                      {sub}
                    </text>
                  )}
                </g>
              );
              return m.href ? (
                <a key={tile.key} href={m.href}>
                  {body}
                </a>
              ) : (
                <g key={tile.key}>{body}</g>
              );
            })}
          </svg>
        )
      )}
    </div>
  );
}
