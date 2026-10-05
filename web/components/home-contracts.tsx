import { DEPLOYMENT, explorerAddress } from "@/lib/chain";
import { shortAddress } from "@/lib/format";

const REPO = "https://github.com/RohanGlitched/tessera-robinhood";

const CONTRACTS = [
  {
    name: "TesseraFactory",
    address: DEPLOYMENT.factory,
    does: "Checks a recipe once (one to eight distinct stocks, weights summing to exactly 100%, a creator fee of at most 1%) and deploys an immutable Basket at a CREATE2 address anyone can predict.",
    file: "contracts/contracts/TesseraFactory.sol",
  },
  {
    name: "Basket",
    address: DEPLOYMENT.baskets[0]?.address,
    does: "The share token and its vault, one per basket. mint pulls the recipe in kind, rounding up; redeem burns first and pays out pro rata, rounding down. The only non-view functions are ERC-20 transfers, mint and redeem.",
    file: "contracts/contracts/Basket.sol",
  },
  {
    name: "CreationDesk",
    address: DEPLOYMENT.desk,
    does: "Cash creations in USDG. A buyer escrows USDG for N shares; anyone delivers the stocks to fill it; the basket mints straight to the buyer and the filler collects the USDG. The buyer can cancel any time; anyone can return expired escrow.",
    file: "contracts/contracts/CreationDesk.sol",
  },
];

/** Three contracts, verified on Robinhood Chain, and the list of what none of them has. */
export function Contracts() {
  return (
    <div>
      <div className="max-w-[48ch]">
        <h2 className="display text-title text-ivory">Three contracts. No owner, no pause, no upgrade, no setter, no price.</h2>
        <p className="mt-5 text-base leading-relaxed text-ivory-dim">
          Everything a basket can do is in three small Solidity contracts, verified on Robinhood Chain testnet. The bytecode has been scanned for{" "}
          <span className="tnum">DELEGATECALL</span> and <span className="tnum">SELFDESTRUCT</span>; there are none.
        </p>
      </div>
      <ol className="mt-10 grid gap-px bg-rule lg:grid-cols-3">
        {CONTRACTS.map((c) => (
          <li key={c.name} className="flex flex-col bg-ground-deep p-6">
            <p className="flex items-baseline justify-between gap-3">
              <span className="display text-2xl text-ivory">{c.name}</span>
              {c.address && (
                <a href={`${explorerAddress(c.address)}#code`} target="_blank" rel="noreferrer" className="tnum text-xs text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold">
                  {shortAddress(c.address, 6, 4)}
                </a>
              )}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ivory-dim">{c.does}</p>
            <a href={`${REPO}/blob/main/${c.file}`} target="_blank" rel="noreferrer" className="tnum mt-auto pt-4 text-xs text-ivory-faint hover:text-ivory">
              {c.file.split("/").pop()}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

const GUARANTEES: [string, string, string][] = [
  ["Never under-collateralised", "Deposits round up, withdrawals round down; dust stays in the vault.", "Seeded random mint, redeem and transfer walks of 150 to 250 steps, ending in a full bank run, assert vault ≥ claim after every step."],
  ["No oracle risk", "Neither mint nor redeem reads a price.", "No price input exists in the ABI."],
  ["Fee-on-transfer tokens are refused", "The vault measures what it received and reverts with ShortDeposit.", "A skimming mock token."],
  ["Reentrancy", "nonReentrant on every state-changing entry point of Basket and CreationDesk.", "A hostile token that re-enters mint and redeem is rejected."],
  ["Creator fees never touch the vault", "Fees are paid as newly minted shares.", "Backing per share is identical before and after fee-bearing mints."],
  ["Immutable recipe", "No setters; the recipe is written in the constructor.", "ABI enumeration: the only non-view functions are transfers, mint and redeem."],
  ["Deterministic addresses", "CREATE2 with keccak256(creator, symbol).", "The address is predicted off chain and matched; SymbolTaken stops a shadow basket."],
  ["Desk lifecycle", "Open, then Filled or Cancelled, once.", "Fill after expiry, double fill, third-party cancel, expired-escrow return, exact USDG and share flows, event arguments."],
  ["Corporate actions pass through", "Stock Tokens express splits and dividends through a multiplier, so a raw-unit recipe is unaffected.", "Design property, documented in Basket.sol."],
];

const GAS: [string, string][] = [
  ["createBasket, 3 stocks", "1,501,440"],
  ["mint, warm vault", "146,688"],
  ["redeem", "109,142"],
  ["placeOrder", "201,123"],
  ["fill, 3 stocks", "299,752"],
];

/** The guarantees, how each is enforced, and the test that proves it. */
export function Guarantees() {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[46ch]">
          <h2 className="display text-title text-ivory">Nine guarantees, and the tests that prove them.</h2>
          <p className="mt-4 text-base leading-relaxed text-ivory-dim">
            A claim in a README is not a guarantee. Each line below names the rule, how the contract enforces it, and the test that would fail if it
            stopped being true.
          </p>
        </div>
        <dl className="flex gap-10">
          <div>
            <dt className="text-xs text-ivory-faint">Tests</dt>
            <dd className="tnum display mt-1 text-3xl text-ivory">94</dd>
          </div>
          <div>
            <dt className="text-xs text-ivory-faint">Coverage</dt>
            <dd className="tnum display mt-1 text-3xl text-ivory">100%</dd>
          </div>
          <div>
            <dt className="text-xs text-ivory-faint">Contracts</dt>
            <dd className="tnum display mt-1 text-3xl text-ivory">3</dd>
          </div>
        </dl>
      </div>
      <div className="mt-8 overflow-x-auto border border-rule">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="bg-ground text-left text-xs text-ivory-faint">
              <th className="px-4 py-3 font-normal">Guarantee</th>
              <th className="px-4 py-3 font-normal">How it is enforced</th>
              <th className="px-4 py-3 font-normal">Proved by</th>
            </tr>
          </thead>
          <tbody>
            {GUARANTEES.map(([g, how, proof]) => (
              <tr key={g} className="border-t border-rule align-top">
                <td className="px-4 py-3 text-ivory">{g}</td>
                <td className="px-4 py-3 text-ivory-dim">{how}</td>
                <td className="px-4 py-3 text-ivory-dim">{proof}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <p className="text-sm leading-relaxed text-ivory-faint">
          Statement, branch, function and line coverage are all 100% on all three contracts. The suite also runs hostile mock tokens (fee-on-transfer,
          reentrant, pausable and blocklisting), exact event arguments and gas ceilings, and every flow once more against forked Robinhood testnet
          tokens and USDG.{" "}
          <a href={`${REPO}/blob/main/contracts/SECURITY.md`} target="_blank" rel="noreferrer" className="text-ivory-dim underline decoration-rule-bright underline-offset-4 hover:text-ivory">
            Threat model and known limits
          </a>
        </p>
        <dl className="grid grid-cols-2 gap-px bg-rule sm:grid-cols-5">
          {GAS.map(([op, gas]) => (
            <div key={op} className="bg-ground-deep p-4">
              <dt className="text-xs text-ivory-faint">{op}</dt>
              <dd className="tnum display mt-1 text-lg text-ivory">{gas}</dd>
              <dd className="text-xs text-ivory-faint">gas</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-3 text-xs text-ivory-faint">At Robinhood Chain&rsquo;s 0.01 gwei, a first mint costs about $0.000005 of gas.</p>
    </div>
  );
}
