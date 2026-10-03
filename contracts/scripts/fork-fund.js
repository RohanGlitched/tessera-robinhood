// Local fork only: give the deployer real testnet stock tokens, USDG and ETH by
// impersonating existing holders, so the full app can be rehearsed offline.
const { ethers, network } = require("hardhat");
const { TOKENS, USDG } = require("./robinhood");
const WHALES = {
  TSLA: "0xFfEf1147c3724a19AB7328F4e361C049ba452dA9",
  AMZN: "0x0A837200fB77687ba9b749E5174bd9a09E51286A",
  AMD: "0xae12d50f75ea3f4Cf983Af1272614754e7F5e813",
  PLTR: "0x82A81E9EdB32958104A2c9514b8Fc85F972b53Af",
  NFLX: "0xcD8a64d13D5B99Dc546a3D6FFD8e5C7dD0Ecb1a0",
  USDG: "0x99F7F9d6246155c0EB4E58d24ac56a8739b77a9F",
};
async function main() {
  const to = process.env.DEPLOYER_ADDRESS;
  await network.provider.send("hardhat_setBalance", [to, "0x8AC7230489E80000"]);
  const erc = (a) => ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", a);
  for (const [sym, whale] of Object.entries(WHALES)) {
    await network.provider.send("hardhat_impersonateAccount", [whale]);
    await network.provider.send("hardhat_setBalance", [whale, "0x8AC7230489E80000"]);
    const s = await ethers.getSigner(whale);
    const token = await erc(sym === "USDG" ? USDG : TOKENS[sym].address);
    const amt = sym === "USDG" ? 2000n * 10n ** 6n : ethers.parseEther("5");
    await token.connect(s).transfer(to, amt);
    console.log("funded", sym);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
