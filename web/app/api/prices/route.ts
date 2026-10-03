import { NextResponse } from "next/server";
import { STOCKS } from "@/lib/tokens";

export const revalidate = 15;

type Quote = {
  bid: string;
  ask: string;
  dailyHigh: string;
  dailyLow: string;
  isTradingHalt: boolean;
  generatedAt: string;
};

/**
 * Live quotes for every stock token Tessera supports, from Robinhood's Stock
 * Token API. Proxied so the browser makes one request and the API sees one
 * client, and cached for the same 15 seconds Robinhood caches it.
 */
export async function GET() {
  const entries = await Promise.all(
    STOCKS.map(async (s) => {
      try {
        const r = await fetch(`https://api.robinhood.com/rhj/prices/${s.symbol}`, {
          next: { revalidate: 15 },
        });
        const q: Quote = (await r.json()).quotes[0];
        const bid = Number(q.bid);
        const ask = Number(q.ask);
        return [
          s.symbol,
          {
            mid: (bid + ask) / 2,
            bid,
            ask,
            high: Number(q.dailyHigh),
            low: Number(q.dailyLow),
            halted: q.isTradingHalt,
            at: q.generatedAt,
          },
        ] as const;
      } catch {
        return [s.symbol, null] as const;
      }
    }),
  );
  return NextResponse.json(Object.fromEntries(entries), {
    headers: { "cache-control": "s-maxage=15, stale-while-revalidate=30" },
  });
}
