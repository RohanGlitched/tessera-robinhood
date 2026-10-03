import type { Address } from "viem";

/**
 * The Robinhood Stock Tokens live on Robinhood Chain testnet. Prices come from
 * Robinhood's own Stock Token API, which quotes the underlying equity.
 */
export type Stock = {
  symbol: string;
  name: string;
  address: Address;
  decimals: 18;
  /** One line on what the company is, for people who only know the ticker. */
  blurb: string;
};

export const STOCKS: Stock[] = [
  {
    symbol: "TSLA",
    name: "Tesla",
    address: "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    decimals: 18,
    blurb: "Electric vehicles, batteries and robotaxis",
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    address: "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    decimals: 18,
    blurb: "Retail, logistics and AWS cloud",
  },
  {
    symbol: "AMD",
    name: "AMD",
    address: "0x71178BAc73cBeb415514eB542a8995b82669778d",
    decimals: 18,
    blurb: "CPUs and AI accelerators",
  },
  {
    symbol: "PLTR",
    name: "Palantir",
    address: "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    decimals: 18,
    blurb: "Data and AI platforms for government and enterprise",
  },
  {
    symbol: "NFLX",
    name: "Netflix",
    address: "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    decimals: 18,
    blurb: "Streaming film, series and games",
  },
];

export const USDG = {
  symbol: "USDG",
  name: "Global Dollar (Paxos)",
  address: "0x7E955252E15c84f5768B83c41a71F9eba181802F" as Address,
  decimals: 6,
};

const byAddress = new Map(STOCKS.map((s) => [s.address.toLowerCase(), s]));
export const stockByAddress = (a: string) => byAddress.get(a.toLowerCase());
export const stockBySymbol = (s: string) => STOCKS.find((x) => x.symbol === s);
