import Link from "next/link";
import { DEPLOYMENT, IS_DEPLOYED, explorerAddress } from "@/lib/chain";

export const metadata = { title: "How it works" };

const RULES = [
  [
    "The recipe is fixed",
    "A basket is a list of stock tokens and how many raw units of each back one share. The factory checks it once (one to eight distinct stocks, weights adding to exactly 100%, a creator fee of at most 1%) and deploys a contract with no setter, no owner, no pause and no upgrade path.",
  ],
  [
    "Shares are created in kind",
    "To mint, you hand the vault the exact units the recipe names and receive the shares. The contract never reads a price, so a stale or manipulated feed cannot mis-price a mint or a redemption.",
  ],
  [
    "Rounding always favours holders",
    "Deposits round up and withdrawals round down. Rounding dust stays in the vault, so it can never owe more than it holds. The test suite hammers this with odd-sized mints and redemptions.",
  ],
  [
    "Corporate actions pass straight through",
    "Robinhood Stock Tokens reflect splits and dividends through a multiplier on the token, not by moving raw balances. A raw-unit recipe is untouched by them, and whatever accrues to the token accrues to every share.",
  ],
  [
    "Creators earn in shares",
    "A creator's fee is a slice of each mint, paid as newly created shares. It never comes out of the vault, so backing per share is identical before and after.",
  ],
  [
    "Cash creations through USDG",
    "The creation desk lets someone with only USDG buy a basket. They escrow USDG; anyone holding the stocks fills the order, the vault mints the shares to the buyer, and the filler is paid. The buyer can cancel for a full refund at any time, and anyone can return expired escrow.",
  ],
  [
    "Anyone can be the participant",
    "Filling an order is permissionless: the desk pulls the stocks from whoever calls fill, mints to the buyer and pays the filler the escrowed USDG, so the premium goes to whoever delivers first. On the testnet a house participant run by the project does this within a minute, pricing each order against live Robinhood quotes. It has no special rights on chain.",
  ],
];

export default function Method() {
  return (
    <section className="mx-auto max-w-[920px] px-5 pt-14 sm:px-8">
      <h1 className="display text-title text-ivory">How Tessera works on Robinhood Chain</h1>
      <p className="mt-4 max-w-[62ch] text-[1.05rem] leading-relaxed text-ivory-dim">
        An ETF holds shares of companies and issues units against them. Tessera does the same thing
        on chain with Robinhood Stock Tokens, with every rule enforced by three small Solidity
        contracts.
      </p>
      <div className="mt-12 divide-y divide-rule border-y border-rule">
        {RULES.map(([t, d]) => (
          <div key={t} className="grid gap-3 py-7 sm:grid-cols-[14rem_1fr] sm:gap-10">
            <h2 className="display text-xl text-ivory">{t}</h2>
            <p className="leading-relaxed text-ivory-dim">{d}</p>
          </div>
        ))}
      </div>
      {IS_DEPLOYED && (
        <div className="mt-12 border border-rule p-6 text-sm">
          <p className="text-ivory">Contracts on Robinhood Chain testnet</p>
          <ul className="tnum mt-3 space-y-2 text-ivory-dim">
            <li>
              Factory{" "}
              <a className="break-all hover:text-gold" href={explorerAddress(DEPLOYMENT.factory)} target="_blank" rel="noreferrer">
                {DEPLOYMENT.factory}
              </a>
            </li>
            <li>
              Creation desk{" "}
              <a className="break-all hover:text-gold" href={explorerAddress(DEPLOYMENT.desk)} target="_blank" rel="noreferrer">
                {DEPLOYMENT.desk}
              </a>
            </li>
          </ul>
        </div>
      )}
      <Link href="/compose" className="mt-12 inline-block bg-gold px-5 py-3 text-sm font-medium text-ground-deep">
        Create a basket
      </Link>
    </section>
  );
}
