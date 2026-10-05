"use client";

import Link from "next/link";
import { BasketMosaic } from "./basket-mosaic";
import { basketTiles } from "./basket-card";
import { usePrices } from "./prices";
import { Ticker } from "./ticker";
import { ONE_SHARE, navPerShare, tokenAmount, useBasket } from "@/lib/baskets";
import { DEPLOYMENT, explorerAddress } from "@/lib/chain";
import { money, percent, quantity, shortAddress } from "@/lib/format";

/** The basket taken apart on the home page: the first one the factory published. */
const ANATOMY = DEPLOYMENT.baskets[0]?.address;

/**
 * One share, taken apart. The recipe's raw units per stock, the live Robinhood
 * quote behind each, what that comes to, and whether the vault holds it: every
 * figure read from the chain and the quote feed on this load.
 */
export function Anatomy() {
  const { basket, error } = useBasket(ANATOMY);
  const { prices } = usePrices();
  if (!ANATOMY || error) return null;
  if (!basket) return <div className="skeleton h-[420px] border border-rule" />;

  const nav = navPerShare(basket, prices);
  const rows = basket.components.map((c, i) => {
    const p = c.stock ? prices[c.stock.symbol] : null;
    const units = tokenAmount(c.unitsPerShare);
    const value = p ? units * p.mid : null;
    const owed = (c.unitsPerShare * basket.totalSupply) / ONE_SHARE;
    const held = basket.vault[i] ?? 0n;
    return { c, p, units, value, owed, held, coverage: owed === 0n ? 1 : Number(held) / Number(owed) };
  });
  const coverage = Math.min(...rows.map((r) => r.coverage));

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
      <div>
        <h2 className="display text-title max-w-[22ch] text-ivory">One share, taken apart.</h2>
        <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-ivory-dim">
          A share of {basket.name} is not a price. It is {basket.components.length} exact quantities of stock tokens, written into the contract
          once and held in a vault anyone can read. What it is worth follows from what those tokens are worth right now.
        </p>
        <div className="mt-8">
          <BasketMosaic tiles={basketTiles(basket)} height={300} />
        </div>
        <p className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-xs text-ivory-faint">
          <span>
            ${basket.symbol} · {basket.components.length} stocks · by {shortAddress(basket.creator, 6, 4)}
          </span>
          <Link href={`/basket/${basket.address}`} className="text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold">
            Open the basket
          </Link>
        </p>
      </div>

      <div className="self-center">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-ivory-faint">
              <th className="pb-3 font-normal">In one share</th>
              <th className="pb-3 text-right font-normal">Tokens</th>
              <th className="hidden pb-3 text-right font-normal sm:table-cell">Quote</th>
              <th className="pb-3 text-right font-normal">Worth</th>
              <th className="pb-3 text-right font-normal">In the vault</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, p, units, value, held, coverage }) => (
              <tr key={c.token} className="border-t border-rule">
                <td className="py-3 pr-3">
                  <span className="text-ivory">{c.stock?.symbol ?? shortAddress(c.token)}</span>
                  <span className="block text-xs text-ivory-faint">{c.stock?.name ?? "unknown token"}</span>
                </td>
                <td className="tnum py-3 text-right text-ivory">{quantity(units, 4)}</td>
                <td className="tnum hidden py-3 text-right text-ivory-dim sm:table-cell">{p ? money(p.mid) : "—"}</td>
                <td className="tnum py-3 text-right text-ivory">
                  <Ticker value={money(value)} />
                </td>
                <td className="tnum py-3 text-right text-ivory-dim">
                  {quantity(tokenAmount(held), 4)}
                  <span className="block text-xs" style={{ color: coverage >= 1 ? "var(--color-gain)" : "var(--color-loss)" }}>
                    {(coverage * 100).toFixed(1)}% of what shares claim
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-rule-bright">
              <td className="pt-4 text-ivory" colSpan={3}>
                One share, at live quotes
              </td>
              <td className="tnum display pt-4 text-right text-xl text-ivory" colSpan={2}>
                <Ticker value={money(nav)} />
              </td>
            </tr>
          </tfoot>
        </table>

        <dl className="mt-7 grid grid-cols-3 gap-px bg-rule">
          <div className="bg-ground p-4">
            <dt className="text-xs text-ivory-faint">Shares outstanding</dt>
            <dd className="tnum display mt-1 text-xl text-ivory">{quantity(tokenAmount(basket.totalSupply), 2)}</dd>
          </div>
          <div className="bg-ground p-4">
            <dt className="text-xs text-ivory-faint">Vault covers the shares</dt>
            <dd className="tnum display mt-1 text-xl" style={{ color: coverage >= 1 ? "var(--color-gain)" : "var(--color-loss)" }}>
              {(coverage * 100).toFixed(2)}%
            </dd>
          </div>
          <div className="bg-ground p-4">
            <dt className="text-xs text-ivory-faint">Creations so far</dt>
            <dd className="tnum display mt-1 text-xl text-ivory">{basket.mintCount}</dd>
            <dd className="tnum text-xs text-ivory-faint">{basket.redeemCount} redeemed</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-ivory-faint">
          Coverage is the vault&rsquo;s balance of each token over what the outstanding shares claim, read with <span className="tnum">vaultBalances()</span>{" "}
          on this load. Deposits round up and withdrawals round down, so it can only ever be at or above 100%.{" "}
          <a href={explorerAddress(basket.address)} target="_blank" rel="noreferrer" className="text-ivory-dim underline decoration-rule-bright underline-offset-4 hover:text-ivory">
            Read the contract yourself
          </a>
        </p>
      </div>
    </div>
  );
}
