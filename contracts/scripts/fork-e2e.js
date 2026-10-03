// End-to-end rehearsal against a local fork of Robinhood Chain testnet, using
// the real Stock Token and USDG contracts. Run with:
//   FORK=1 npx hardhat run scripts/fork-e2e.js
const { ethers, network } = require("hardhat");
const { TOKENS, USDG, SEEDS, fetchPrices, recipeFor } = require("./robinhood");

const WHALES = {
  TSLA: "0xFfEf1147c3724a19AB7328F4e361C049ba452dA9",
  AMZN: "0x0A837200fB77687ba9b749E5174bd9a09E51286A",
  AMD: "0xae12d50f75ea3f4Cf983Af1272614754e7F5e813",
  PLTR: "0x82A81E9EdB32958104A2c9514b8Fc85F972b53Af",
  NFLX: "0xcD8a64d13D5B99Dc546a3D6FFD8e5C7dD0Ecb1a0",
};
const USDG_WHALE = "0x99F7F9d6246155c0EB4E58d24ac56a8739b77a9F";

async function impersonate(addr) {
  await network.provider.send("hardhat_impersonateAccount", [addr]);
  await network.provider.send("hardhat_setBalance", [addr, "0x56BC75E2D63100000"]);
  return ethers.getSigner(addr);
}

function check(cond, msg) {
  if (!cond) throw new Error("FAILED: " + msg);
  console.log("  ok  " + msg);
}

async function main() {
  const [creator, buyer, ap] = await ethers.getSigners();
  const erc = (a) => ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", a);

  // Fund test accounts with real testnet stock tokens and USDG.
  for (const sym of Object.keys(TOKENS)) {
    const whale = await impersonate(WHALES[sym]);
    const t = await erc(TOKENS[sym].address);
    for (const to of [creator, ap]) await t.connect(whale).transfer(to, ethers.parseEther("5"));
  }
  const usdgWhale = await impersonate(USDG_WHALE);
  const usdg = await erc(USDG);
  await usdg.connect(usdgWhale).transfer(buyer, 500n * 10n ** 6n);
  check((await usdg.balanceOf(buyer)) === 500n * 10n ** 6n, "buyer holds 500 testnet USDG");

  const factory = await (await ethers.getContractFactory("TesseraFactory")).deploy();
  const desk = await (await ethers.getContractFactory("CreationDesk")).deploy(USDG, factory);
  const prices = await fetchPrices();
  const seed = SEEDS[0];
  await factory.connect(creator).createBasket(seed.name, seed.symbol, seed.feeBps, recipeFor(seed, prices));
  const basket = await ethers.getContractAt("Basket", (await factory.allBaskets())[0]);
  check((await basket.componentCount()) === 5n, "HOOD5 basket holds the 5 Robinhood stock tokens");

  // In-kind mint with the real tokens.
  const shares = ethers.parseEther("3");
  const need = await basket.previewMint(shares);
  const comps = await basket.components();
  for (const c of comps) await (await erc(c.token)).connect(creator).approve(basket, ethers.MaxUint256);
  await basket.connect(creator).mint(shares, creator);
  const vault = await basket.vaultBalances();
  check(vault.every((v, i) => v === need[i]), "vault holds exactly the recipe for 3 shares");
  check((await basket.totalSupply()) === shares, "3 shares in circulation");

  // Redeem half in kind.
  const half = (await basket.balanceOf(creator)) / 2n;
  const tsla = await erc(TOKENS.TSLA.address);
  const before = await tsla.balanceOf(creator);
  const out = await basket.previewRedeem(half);
  await basket.connect(creator).redeem(half, creator);
  check((await tsla.balanceOf(creator)) - before === out[0], "redemption returned TSLA pro rata");

  // USDG cash creation through the desk.
  const navUsd = 10;
  const usdgAmount = BigInt(Math.round(navUsd * 2 * 1.01 * 1e6));
  await usdg.connect(buyer).approve(desk, usdgAmount);
  const expiry = (await ethers.provider.getBlock("latest")).timestamp + 3600;
  await desk.connect(buyer).placeOrder(basket, ethers.parseEther("2"), usdgAmount, expiry);
  for (const c of comps) await (await erc(c.token)).connect(ap).approve(desk, ethers.MaxUint256);
  await desk.connect(ap).fill(0);
  const [net] = await basket.previewNetShares(ethers.parseEther("2"));
  check((await basket.balanceOf(buyer)) === net, "buyer received basket shares for USDG");
  check((await usdg.balanceOf(ap)) === usdgAmount, "participant received the escrowed USDG");

  // Backing invariant.
  const owed = await basket.previewRedeem(await basket.totalSupply());
  const held = await basket.vaultBalances();
  check(held.every((h, i) => h >= owed[i]), "every share is fully backed after all flows");
  console.log("\nfork end-to-end: all checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
