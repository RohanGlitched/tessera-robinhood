import { NextResponse } from "next/server";
import { fetchMoves, fetchPreviousCloses, fetchQuotes } from "@/lib/quotes";

export const revalidate = 15;

/**
 * Live quotes for every stock token Tessera supports, from Robinhood's Stock
 * Token API. Proxied so the browser makes one request and the API sees one
 * client, and cached for the same 15 seconds Robinhood caches it.
 */
export async function GET() {
  const [moves, quotes, closes] = await Promise.all([fetchMoves(), fetchQuotes(), fetchPreviousCloses()]);
  const out = Object.fromEntries(
    Object.entries(quotes).map(([sym, p]) => {
      if (!p) return [sym, null];
      // The move since the last official close when we have it; the 24h move
      // of the same equity's Solana token as a fallback.
      const prev = closes[sym];
      const change24h = prev ? (p.mid / prev - 1) * 100 : (moves[sym]?.change ?? null);
      return [sym, { ...p, change24h, prevClose: prev ?? null, mcap: moves[sym]?.mcap ?? null }];
    }),
  );
  return NextResponse.json(out, {
    headers: { "cache-control": "s-maxage=15, stale-while-revalidate=30" },
  });
}
