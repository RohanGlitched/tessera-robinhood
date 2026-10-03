"use client";

import { useEffect, useState } from "react";
import { erc20Abi, formatUnits, type Address } from "viem";
import { basketAbi, tesseraFactoryAbi, creationDeskAbi } from "./abi";
import { DEPLOYMENT, IS_DEPLOYED, publicClient } from "./chain";
import { stockByAddress, type Stock } from "./tokens";
import type { Price } from "@/components/prices";

export type Component = {
  token: Address;
  unitsPerShare: bigint;
  weightBps: number;
  stock: Stock | undefined;
};

export type BasketInfo = {
  address: Address;
  name: string;
  symbol: string;
  creator: Address;
  feeBps: number;
  createdAt: number;
  totalSupply: bigint;
  mintCount: number;
  redeemCount: number;
  components: Component[];
  vault: bigint[];
};

export const ONE_SHARE = 10n ** 18n;

async function loadBasket(address: Address): Promise<BasketInfo> {
  const c = { address, abi: basketAbi } as const;
  const [name, symbol, creator, feeBps, createdAt, totalSupply, mintCount, redeemCount, comps, vault] =
    await publicClient.multicall({
      allowFailure: false,
      contracts: [
        { ...c, functionName: "name" },
        { ...c, functionName: "symbol" },
        { ...c, functionName: "creator" },
        { ...c, functionName: "creatorFeeBps" },
        { ...c, functionName: "createdAt" },
        { ...c, functionName: "totalSupply" },
        { ...c, functionName: "mintCount" },
        { ...c, functionName: "redeemCount" },
        { ...c, functionName: "components" },
        { ...c, functionName: "vaultBalances" },
      ],
    });
  return {
    address,
    name,
    symbol,
    creator,
    feeBps: Number(feeBps),
    createdAt: Number(createdAt),
    totalSupply,
    mintCount: Number(mintCount),
    redeemCount: Number(redeemCount),
    components: comps.map((x) => ({
      token: x.token,
      unitsPerShare: x.unitsPerShare,
      weightBps: Number(x.weightBps),
      stock: stockByAddress(x.token),
    })),
    vault: [...vault],
  };
}

/** Every basket the factory has published, newest first. */
export function useBaskets(refreshKey = 0) {
  const [state, setState] = useState<{ baskets: BasketInfo[] | null; error: string | null }>({
    baskets: null,
    error: null,
  });
  useEffect(() => {
    if (!IS_DEPLOYED) {
      setState({ baskets: [], error: null });
      return;
    }
    let alive = true;
    (async () => {
      try {
        const list = await publicClient.readContract({
          address: DEPLOYMENT.factory,
          abi: tesseraFactoryAbi,
          functionName: "allBaskets",
        });
        const baskets = await Promise.all([...list].reverse().map(loadBasket));
        if (alive) setState({ baskets, error: null });
      } catch (e) {
        if (alive) setState({ baskets: null, error: (e as Error).message });
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshKey]);
  return state;
}

export function useBasket(address: Address, refreshKey = 0) {
  const [state, setState] = useState<{ basket: BasketInfo | null; error: string | null }>({
    basket: null,
    error: null,
  });
  useEffect(() => {
    let alive = true;
    loadBasket(address)
      .then((basket) => alive && setState({ basket, error: null }))
      .catch(() => alive && setState({ basket: null, error: "No Tessera basket lives at this address." }));
    return () => {
      alive = false;
    };
  }, [address, refreshKey]);
  return state;
}

/** Balances of `tokens` held by `owner`, as raw units. */
export function useBalances(tokens: Address[], owner: Address | null, refreshKey = 0) {
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  const key = tokens.join(",");
  useEffect(() => {
    if (!owner || !tokens.length) {
      setBalances({});
      return;
    }
    let alive = true;
    publicClient
      .multicall({
        allowFailure: false,
        contracts: tokens.map((t) => ({
          address: t,
          abi: erc20Abi,
          functionName: "balanceOf" as const,
          args: [owner] as const,
        })),
      })
      .then((r) => alive && setBalances(Object.fromEntries(tokens.map((t, i) => [t.toLowerCase(), r[i]]))))
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, owner, refreshKey]);
  return balances;
}

export const tokenAmount = (raw: bigint, decimals = 18) => Number(formatUnits(raw, decimals));

/** Dollar value of one whole share at live prices. Null until every price is in. */
export function navPerShare(b: BasketInfo, prices: Record<string, Price | null>): number | null {
  let total = 0;
  for (const c of b.components) {
    const p = c.stock && prices[c.stock.symbol];
    if (!p) return null;
    total += tokenAmount(c.unitsPerShare) * p.mid;
  }
  return total;
}

/** Dollar value of everything in the vault. */
export function vaultValue(b: BasketInfo, prices: Record<string, Price | null>): number | null {
  let total = 0;
  for (let i = 0; i < b.components.length; i++) {
    const c = b.components[i];
    const p = c.stock && prices[c.stock.symbol];
    if (!p) return null;
    total += tokenAmount(b.vault[i]) * p.mid;
  }
  return total;
}

export type DeskOrder = {
  id: number;
  buyer: Address;
  basket: Address;
  expiry: number;
  shares: bigint;
  usdgAmount: bigint;
  status: number;
  filler: Address;
};

/** Creation desk orders, optionally for one basket, newest first. */
export function useOrders(basket: Address | null, refreshKey = 0) {
  const [orders, setOrders] = useState<DeskOrder[] | null>(null);
  useEffect(() => {
    if (!IS_DEPLOYED) {
      setOrders([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const n = Number(
          await publicClient.readContract({
            address: DEPLOYMENT.desk,
            abi: creationDeskAbi,
            functionName: "orderCount",
          }),
        );
        const ids = Array.from({ length: n }, (_, i) => n - 1 - i).slice(0, 60);
        const raw = ids.length
          ? await publicClient.multicall({
              allowFailure: false,
              contracts: ids.map((id) => ({
                address: DEPLOYMENT.desk,
                abi: creationDeskAbi,
                functionName: "getOrder" as const,
                args: [BigInt(id)] as const,
              })),
            })
          : [];
        const list = raw
          .map((o, i) => ({
            id: ids[i],
            buyer: o.buyer,
            basket: o.basket,
            expiry: Number(o.expiry),
            shares: o.shares,
            usdgAmount: o.usdgAmount,
            status: Number(o.status),
            filler: o.filler,
          }))
          .filter((o) => !basket || o.basket.toLowerCase() === basket.toLowerCase());
        if (alive) setOrders(list);
      } catch {
        if (alive) setOrders([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [basket, refreshKey]);
  return orders;
}
