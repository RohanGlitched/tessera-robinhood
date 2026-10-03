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
 * The 24-hour move comes from the same equities tokenised on Solana as xStocks,
 * because Robinhood's quote endpoint carries no previous close. Prices
 * themselves always come from Robinhood.
 */
const XSTOCK_MINTS: Record<string, string> = {
  TSLA: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
  AMZN: "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg",
  AMD: "XsXcJ6GZ9kVnjqGsjBnktRcuwMBmvKWh8S93RefZ1rF",
  PLTR: "XsoBhf2ufR8fTyNSjqfU71DYGaE6Z3SUGAidpzriAA4",
  NFLX: "XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL",
};

type Move = { change: number | null; mcap: number | null };

async function changes(): Promise<Record<string, Move>> {
  try {
    const ids = Object.values(XSTOCK_MINTS).join(",");
    const r = await fetch(`https://lite-api.jup.ag/price/v3?ids=${ids}`, { next: { revalidate: 60 } });
    const j = (await r.json()) as Record<string, { priceChange24h?: number; stockData?: { mcap?: number } }>;
    return Object.fromEntries(
      Object.entries(XSTOCK_MINTS).map(([sym, mint]) => [
        sym,
        { change: j[mint]?.priceChange24h ?? null, mcap: j[mint]?.stockData?.mcap ?? null },
      ]),
    );
  } catch {
    return {};
  }
}

/**
 * Live quotes for every stock token Tessera supports, from Robinhood's Stock
 * Token API. Proxied so the browser makes one request and the API sees one
 * client, and cached for the same 15 seconds Robinhood caches it.
 */
export async function GET() {
  const [moves, entries] = await Promise.all([
    changes(),
    Promise.all(
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
    ),
  ]);
  const out = Object.fromEntries(
    entries.map(([sym, p]) => [sym, p ? { ...p, change24h: moves[sym]?.change ?? null, mcap: moves[sym]?.mcap ?? null } : null]),
  );
  return NextResponse.json(out, {
    headers: { "cache-control": "s-maxage=15, stale-while-revalidate=30" },
  });
}
