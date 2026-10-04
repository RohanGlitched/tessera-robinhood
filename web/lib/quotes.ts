import { STOCKS } from "./tokens";

/** Server-side quotes from Robinhood's Stock Token API. Shared by the price proxy and the participant. */

type Quote = {
  bid: string;
  ask: string;
  dailyHigh: string;
  dailyLow: string;
  isTradingHalt: boolean;
  generatedAt: string;
};

export type ServerQuote = {
  mid: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  halted: boolean;
  at: string;
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

export type Move = { change: number | null; mcap: number | null };

export async function fetchMoves(): Promise<Record<string, Move>> {
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
 * Yesterday's official close for each stock, so "today" is the move since the
 * last close: stable between page loads and zero-change on a frozen weekend
 * quote. Null for any symbol that could not be read.
 */
export async function fetchPreviousCloses(): Promise<Record<string, number | null>> {
  const entries = await Promise.all(
    STOCKS.map(async (s) => {
      try {
        const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${s.symbol}?range=1d&interval=1d`, {
          headers: { "user-agent": "Mozilla/5.0" },
          next: { revalidate: 300 },
        });
        const j = (await r.json()) as { chart?: { result?: { meta?: { chartPreviousClose?: number } }[] } };
        const prev = j.chart?.result?.[0]?.meta?.chartPreviousClose;
        return [s.symbol, typeof prev === "number" && prev > 0 ? prev : null] as const;
      } catch {
        return [s.symbol, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

/** Live quotes for every supported stock token, null for any that failed. */
export async function fetchQuotes(): Promise<Record<string, ServerQuote | null>> {
  const entries = await Promise.all(
    STOCKS.map(async (s) => {
      try {
        const r = await fetch(`https://api.robinhood.com/rhj/prices/${s.symbol}`, { next: { revalidate: 15 } });
        const q: Quote = (await r.json()).quotes[0];
        const bid = Number(q.bid);
        const ask = Number(q.ask);
        if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= 0) return [s.symbol, null] as const;
        return [
          s.symbol,
          { mid: (bid + ask) / 2, bid, ask, high: Number(q.dailyHigh), low: Number(q.dailyLow), halted: q.isTradingHalt, at: q.generatedAt },
        ] as const;
      } catch {
        return [s.symbol, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}
