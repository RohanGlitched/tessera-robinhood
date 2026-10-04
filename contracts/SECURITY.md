# Tessera security notes

Scope: `contracts/Basket.sol`, `contracts/TesseraFactory.sol`, `contracts/CreationDesk.sol`
(Solidity 0.8.24, OpenZeppelin 5.6, optimizer 500 runs, via-IR, Cancun). The deployed, verified
addresses are in [`deployments/robinhoodTestnet.json`](deployments/robinhoodTestnet.json).

Run `npm test` for the full suite (94 tests) and `npm run coverage` for coverage. Every claim
below names the test that proves it.

## Trust boundaries

| Party | What they can do | What they cannot do |
| --- | --- | --- |
| Nobody (there is no admin) | - | Pause, upgrade, change a recipe, change a fee, sweep funds, block an address |
| Basket creator | Choose name, symbol, components, units, weights and a fee of at most 1% (in shares) once, at creation | Change anything afterwards; take anything from the vault; mint without depositing |
| Minter | Deposit the exact recipe (rounded up) and receive shares | Mint against a short deposit (fee-on-transfer tokens are refused) |
| Holder | Redeem any amount of their own shares for the recipe (rounded down), to any receiver | Redeem someone else's shares; get more than their pro-rata recipe |
| Desk buyer | Escrow USDG for a number of gross shares; cancel at any time | Change price or size after placing |
| Desk filler | Deliver the components for an open, unexpired order and take exactly its USDG | Take USDG from any other order; pull tokens from anyone but themselves |
| Component token issuer | Whatever its token allows: pause, blocklist, upgrade the token | Touch other components or the share token. **This is the main external trust assumption (see Known limitations).** |
| USDG issuer | Pause or blocklist USDG | Touch stock tokens or baskets |

What has no admin, by construction: all three contracts have no owner, no roles, no pause, no
proxy, no `receive`/`fallback`, no payable function, and their runtime bytecode contains no
`DELEGATECALL`, `CALLCODE` or `SELFDESTRUCT` (test/immutability.test.js).

## Core invariants

1. **Full backing.** For every component `i`: `vaultBalance[i] * 1e18 >= unitsPerShare[i] * totalSupply`,
   which implies `vaultBalance[i] >= previewRedeem(totalSupply)[i]`. Mints round up, redemptions
   round down, the creator fee is paid in newly issued shares out of the minter's gross amount, so
   it never dilutes backing.
2. **Bookkeeping.** `totalSupply` grows by exactly `shares` on a mint (net to receiver plus fee to
   creator) and shrinks by exactly `shares` on a redemption.
3. **Escrow isolation.** A desk order only ever moves its own `usdgAmount`. After a fill the desk
   holds no stock tokens, no shares and no residual allowance.

Invariants 1 and 2 are checked after every step of four seeded random walks (800 steps of
mints, redemptions, share transfers and direct donations across five accounts, with fees of 0,
37 and 100 bps and recipes as small as 1 raw unit per share), followed by a full bank run in which
every holder exits (test/invariants.test.js).

## Attack table

| Attack | Why it fails | Proof |
| --- | --- | --- |
| Re-enter `mint`/`redeem` from a component's transfer hook | `nonReentrant` on both; burn happens before any transfer out | basket.security: "re-entering mint() from inside mint()" and the three other combinations |
| Re-enter `fill`/`cancel`/`placeOrder` from a token hook | `nonReentrant` on all three; `fill` and `cancel` also set the status before any external call | desk: "a token that re-enters fill()", "re-enters cancel()", "cannot re-enter placeOrder()" |
| Mint with a fee-on-transfer component to under-collateralise the vault | Balance-difference check reverts `ShortDeposit(token, expected, received)` | basket.security: "reverts mint with ShortDeposit(token, expected, received)" |
| Extract value through rounding (many small mints, split redemptions) | Ceil on deposit, floor on payout; splitting a mint never costs less and splitting a redemption never pays more | invariants: "splitting a mint never costs less...", "a mint followed by redeeming everything..." |
| Drain the vault through a bank run | Exact backing invariant holds at every step and every holder can exit in full | invariants: four random walks plus the final drain |
| Change the recipe or fee after people deposit | No setter exists; only ERC-20 functions plus `mint`/`redeem` mutate state | immutability: ABI enumeration for all three contracts |
| Squat a creator's predicted basket address | CREATE2 salt is `keccak256(abi.encode(msg.sender, keccak256(symbol)))`, so the same call from another account lands elsewhere | factory: "an attacker copying a creator's exact call cannot squat..." |
| Shadow your own popular basket with a new recipe under the same symbol | `SymbolTaken(existing)` per creator | factory: "the same creator cannot reuse a symbol" |
| Pass off a look-alike Basket deployed outside the factory | `factory()` is immutable `msg.sender`, so it reveals the deployer; the desk checks `TesseraFactory.isBasket` and refuses it | basket.security: "a Basket deployed outside the factory is not recognised"; desk: "rejects a byte-identical Basket..." |
| Fill an expired order | `block.timestamp > expiry` reverts `Expired`; boundary second is inclusive | desk: "fill after expiry reverts Expired", "a fill at the exact expiry second..." |
| Fill twice, fill a cancelled order, cancel a filled order | Status must be `Open` | desk: "double fill reverts NotOpen...", "a cancelled order cannot be filled..." |
| Grief a buyer by cancelling their live order | Only the buyer may cancel before expiry; after expiry anyone may, but USDG always goes to the buyer | desk: "a third party cannot cancel before expiry...", "after expiry a third party can cancel..." |
| Use a filler's standing approval to pull their tokens | `fill` only ever pulls from `msg.sender` | desk: "a filler with no approval reverts..." |
| Trap a buyer's USDG with a broken or paused component | `cancel` touches only USDG, so the refund path never depends on stock tokens | desk: "a paused component blocks fills but never traps the buyer's USDG", "a fee-on-transfer component..." |
| Place an order for an arbitrary token | `UnknownBasket` unless `TesseraFactory.isBasket` | desk: "rejects a token that is not a factory basket" |

## Known limitations (by design, documented, tested)

- **One frozen component freezes every redemption.** `redeem` pays every component in one
  transaction. If any component token pauses, blocklists the vault, or otherwise reverts on
  transfer, no holder can redeem until it recovers. Shares stay fully backed and transferable in
  the meantime. A blocklisted *holder* can still exit by redeeming to a different receiver.
  (basket.security: "a paused component blocks redemption for every holder", "blocklisting the vault
  itself freezes every redemption", "a blocklisted holder can still exit...")
  A future version could add `redeemExcept(shares, receiver, skipMask)` that forfeits the skipped
  component to remaining holders, keeping the backing invariant intact.
- **Desk orders are fixed-price options for fillers.** There is no on-chain price. A filler fills
  only when the components cost less than the escrowed USDG, so a stale order is filled exactly when
  it is a bad deal for the buyer. Keep expiries short; the buyer can cancel at any time. There is
  nothing to sandwich inside `fill` itself (no price input, no pool); fillers only race each other,
  and the buyer gets the same shares whoever wins. A buyer's cancel and a fill race cleanly: the
  second one reverts `NotOpen`.
- **The desk buyer pays for gross shares.** `placeOrder` is denominated in gross shares; the creator
  fee is issued out of them, so the buyer receives `previewNetShares(shares).net` and the creator the
  fee. `OrderFilled.sharesDelivered` reports the net amount. Interfaces must quote the net figure.
  (desk: "settles exactly: buyer gets net shares, creator gets fee shares...")
- **USDG issuer risk.** If USDG blocklists a buyer, that buyer's refund reverts until they are
  unblocked; if it blocklists the desk, all escrow is frozen. `placeOrder` assumes USDG is not
  fee-on-transfer (true for Paxos USDG).
- **Creators can list anything.** The factory checks structure (non-zero, unique, weights sum to
  10000 bps, at most 8 components, fee at most 1%) but not that a component has code or behaves.
  A basket with a code-less component is simply unmintable. Weights are self-reported metadata and
  are not tied to units on-chain. Symbols are unique per creator only, so two creators can publish
  the same name and symbol: identify baskets by address and creator.
  (basket.security: "a component address with no code makes the basket unmintable...")
- **Dust is permanent.** Rounding remainders and direct donations stay in the vault forever; there is
  no sweep. Redeeming a sliver whose payout rounds to zero still burns it.
- **Out-of-range order ids** revert with `Panic(0x32)` rather than a custom error. Bound reads by
  `orderCount()`. (desk: "getOrder, fill and cancel on a non-existent id...")
- **Defence-in-depth checks that factory baskets cannot reach.** `DustMint` (a zero component amount)
  and the post-fee `ZeroShares` check can only trigger for a Basket deployed outside the factory
  with zero units or a fee above 100%. They are tested that way.

## How to verify the deployment

1. Rebuild from this folder: `npm ci && npx hardhat compile`. Compiler settings are pinned in
   `hardhat.config.js` (0.8.24, optimizer 500 runs, via-IR, Cancun).
2. Open each address from `deployments/robinhoodTestnet.json` on
   <https://explorer.testnet.chain.robinhood.com> and check the contract tab shows "verified" with
   matching compiler settings and source.
3. Compare bytecode yourself: fetch runtime code with `eth_getCode` and compare it to
   `artifacts/contracts/<Name>.sol/<Name>.json` `deployedBytecode`, masking only the immutable
   ranges listed in the build-info `immutableReferences` (for a Basket: factory, creator,
   creatorFeeBps, createdAt). The test "a factory-made basket runs exactly the compiled Basket code,
   immutables aside" performs exactly this comparison locally.
4. For a basket, confirm `TesseraFactory.isBasket(basket)` is true on the deployed factory and read
   `components()`, `creator()` and `creatorFeeBps()`. They cannot change.
