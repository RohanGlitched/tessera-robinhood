"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Price = {
  mid: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  halted: boolean;
  at: string;
  /** Percent move over 24 hours, or null when unknown. */
  change24h: number | null;
  /** Market capitalisation of the underlying company, in dollars. */
  mcap: number | null;
};
type Prices = Record<string, Price | null>;

const Ctx = createContext<{ prices: Prices; updatedAt: number | null }>({
  prices: {},
  updatedAt: null,
});

/** Polls live quotes every 15 seconds, the cache window of the source API. */
export function PriceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ prices: Prices; updatedAt: number | null }>({
    prices: {},
    updatedAt: null,
  });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/prices");
        const prices = (await r.json()) as Prices;
        if (alive) setState({ prices, updatedAt: Date.now() });
      } catch {
        /* keep the last good quotes */
      }
    };
    load();
    const id = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const usePrices = () => useContext(Ctx);
