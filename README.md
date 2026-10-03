# Tessera on Robinhood Chain

**Index baskets of Robinhood Stock Tokens: compose them, mint and redeem them in kind, or buy them with USDG.**

Live app: https://robinhood.teserra.world · Network: Robinhood Chain testnet (chain 46630)

An index fund is a list of companies and a set of weights. Tessera lets anyone publish one on chain:
pick up to eight Robinhood Stock Tokens, set the weights, and launch them as a single ERC-20. Every
share is backed by the real stock tokens in a vault anyone can read, and can be redeemed for them at
any time. People who hold no stock tokens can still buy a basket by posting USDG on the creation desk,
where anyone who holds the stocks fills the order, the way an ETF's authorised participants work.

## Why this matters

- **Robinhood Stock Tokens are single names.** Investors think in themes and indexes ("AI compute",
  "streaming", "the Robinhood five"). Today you have to buy and rebalance each token yourself.
- **Wrapping tokens usually means trusting someone.** Most basket products are priced by an oracle,
  run by an admin key, or both. Tessera has neither: shares are created and redeemed in kind, so the
  contract never needs a price and there is nothing to administer.
- **Cash is how people actually buy.** The creation desk turns USDG into basket shares without the
  vault ever touching cash, so its in-kind guarantees hold.

## What is on chain

Three small Solidity contracts (`contracts/contracts`):

| Contract | What it does |
|---|---|
| `TesseraFactory` | Validates a recipe once (1–8 distinct tokens, weights summing to exactly 100%, creator fee ≤ 1%, name/symbol limits) and deploys an immutable `Basket` at a deterministic CREATE2 address. |
| `Basket` | The share token and its vault. `mint(shares, to)` pulls the recipe in kind, rounding up; `redeem(shares, to)` burns first, then pays out pro rata, rounding down. No owner, no pause, no upgrade, no setter. |
| `CreationDesk` | USDG cash creations. A buyer escrows USDG for N shares; any participant fills by delivering the stock tokens; the basket mints straight to the buyer and the filler collects the USDG. Buyer can cancel any time; anyone can return expired escrow. |

### Guarantees, and how they are enforced

- **Never under-collateralised.** Deposits round up (`Math.Rounding.Ceil`), withdrawals round down, so
  dust always stays in the vault. Tested with odd-sized mints and chunked redemptions.
- **No oracle risk.** Neither mint nor redeem reads a price. Live prices are used only to *display* NAV.
- **Fee-on-transfer tokens are refused.** The vault measures what it actually received and reverts
  with `ShortDeposit` if it is less than the recipe.
- **Creator fees never touch the vault.** They are paid as newly minted shares, so backing per share is
  identical before and after every mint.
- **Corporate actions pass through.** Robinhood Stock Tokens express splits and dividends through a
  multiplier, not by moving raw balances, so a raw-unit recipe is unaffected and holders keep whatever
  accrues.
- **Immutable recipe.** The only state-changing functions on a basket are ERC-20 transfers, `mint` and
  `redeem` (asserted in the test suite).

## Robinhood Chain integration

- **Robinhood Stock Tokens** on testnet: TSLA, AMZN, AMD, PLTR, NFLX (`web/lib/tokens.ts`).
- **Paxos USDG** (testnet `0x915E…03ec`, 6 decimals) settles every creation-desk order.
- **Robinhood Stock Token API** (`api.robinhood.com/rhj/prices`) for live NAV, proxied and cached for
  15 seconds by `web/app/api/prices`.
- Deployed with Hardhat to Robinhood Chain testnet (an Arbitrum Orbit chain), verified on its
  Blockscout explorer.

## Try it without a wallet

Open the app, choose **Connect wallet → Use a test wallet**, then **Get test tokens**. A throwaway key
is created in your browser and the project faucet sends it test ETH, a little of each stock token and
some USDG. You can then mint, redeem, place a USDG order, and fill someone else's.

## Repository

```
contracts/   Hardhat project: Basket, TesseraFactory, CreationDesk, tests and scripts
  test/      14 unit tests (factory validation, rounding, fees, desk lifecycle)
  scripts/   deploy.js, fork-e2e.js (rehearsal against real testnet tokens), robinhood.js
web/         Next.js 15 app (viem): compose, explore, basket, creation desk, method
```

### Run the tests

```bash
cd contracts && npm install --legacy-peer-deps
npx hardhat test
FORK=1 npx hardhat run scripts/fork-e2e.js   # runs every flow against forked Robinhood testnet tokens
```

### Run the app

```bash
cd web && npm install
npm run dev   # http://localhost:3000, reads web/lib/deployment.json
```

Set `FAUCET_PRIVATE_KEY` (a testnet-only key holding test tokens) to enable **Get test tokens**.

### Deploy

```bash
cd contracts
echo "DEPLOYER_PRIVATE_KEY=0x…" > .env          # testnet only
npx hardhat run scripts/deploy.js --network robinhoodTestnet
```

`deploy.js` deploys the factory and desk, publishes three seed baskets sized at $10 a share from
live Robinhood quotes, and writes the addresses to `web/lib/deployment.json`.

## Deployments (Robinhood Chain testnet)

See [`contracts/deployments/robinhoodTestnet.json`](contracts/deployments/robinhoodTestnet.json).

## Prior work

Tessera started as a Solana project (an Anchor program for xStocks baskets, entered in Colosseum).
Everything in this repository was written for Robinhood Chain during the Arbitrum Open House
buildathon: the Solidity contracts, the USDG creation desk, the test suite, the Robinhood integration
and the EVM web app. The visual design system is carried over from the Solana app.

## License

MIT
