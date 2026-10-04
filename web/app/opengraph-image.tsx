import { ImageResponse } from "next/og";
import { COMPONENT_SLOTS } from "@/lib/palette";

export const runtime = "edge";
export const alt = "Tessera on Robinhood Chain: index baskets of Robinhood Stock Tokens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Fraunces for the headline, fetched once at the edge; falls back to serif. */
async function fraunces() {
  try {
    const css = await (
      // Without a browser user agent Google Fonts serves TrueType, which the renderer needs.
      await fetch("https://fonts.googleapis.com/css2?family=Fraunces:wght@400&display=swap", { headers: { "user-agent": "" } })
    ).text();
    const url = css.match(/src: url\((https:[^)]+\.ttf)\)/)?.[1];
    if (!url) return null;
    const data = await (await fetch(url)).arrayBuffer();
    const tag = String.fromCharCode(...new Uint8Array(data.slice(0, 4)));
    return tag === "wOF2" || tag === "wOFF" ? null : data;
  } catch {
    return null;
  }
}

// The HOOD5 seed basket: five equal tiles, as the mosaic on the home page lays them.
const TILES: [string, number, number, number, number][] = [
  ["TSLA", 0, 0, 300, 280],
  ["AMZN", 300, 0, 240, 280],
  ["AMD", 0, 280, 220, 240],
  ["PLTR", 220, 280, 180, 240],
  ["NFLX", 400, 280, 140, 240],
];

export default async function Image() {
  const font = await fraunces();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0a1224",
          color: "#ede6d6",
          fontFamily: "Archivo, Inter, system-ui, sans-serif",
          padding: 56,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", paddingRight: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, color: "#b3ab9c" }}>
            <div style={{ width: 14, height: 14, background: "#b18827" }} />
            <span style={{ color: "#ede6d6", letterSpacing: 2 }}>TESSERA</span>
            <span style={{ width: 1, height: 22, background: "#35446a" }} />
            <span>on Robinhood Chain</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: font ? "Fraunces" : "Georgia, serif", fontSize: 64, lineHeight: 1.04, letterSpacing: -1.5 }}>
              An index fund is a list of companies and a set of weights.
            </div>
            <div style={{ marginTop: 26, fontSize: 24, lineHeight: 1.4, color: "#b3ab9c", maxWidth: 560 }}>
              Robinhood Stock Tokens as one fully backed basket token. Minted in kind, or bought with USDG.
            </div>
          </div>
          <div style={{ display: "flex", gap: 40, fontSize: 20, color: "#888c9c" }}>
            <span>No oracle</span>
            <span>No admin key</span>
            <span>Redeemable any hour</span>
          </div>
        </div>
        <div style={{ display: "flex", position: "relative", width: 540, height: 520, border: "1px solid #24314e", background: "#0f1b33" }}>
          {TILES.map(([sym, x, y, w, h], i) => (
            <div
              key={sym}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: w,
                height: h,
                background: COMPONENT_SLOTS[i],
                border: "3px solid #0f1b33",
                display: "flex",
                alignItems: "flex-end",
                padding: 16,
                fontSize: 26,
                color: "#0a1224",
                fontWeight: 600,
              }}
            >
              {sym}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "Fraunces", data: font, style: "normal", weight: 400 }] : [],
    },
  );
}
