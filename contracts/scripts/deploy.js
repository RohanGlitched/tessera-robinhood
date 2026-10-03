// Deploys Tessera to Robinhood Chain (or a local fork of it) and publishes the
// seed baskets. Writes deployments/<network>.json for the web app.
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");
const { USDG, SEEDS, fetchPrices, recipeFor } = require("./robinhood");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`network ${network.name}  deployer ${deployer.address}`);
  console.log(`balance ${ethers.formatEther(await ethers.provider.getBalance(deployer))} ETH`);

  const factory = await (await ethers.getContractFactory("TesseraFactory")).deploy();
  await factory.waitForDeployment();
  const desk = await (await ethers.getContractFactory("CreationDesk")).deploy(USDG, factory);
  await desk.waitForDeployment();
  const startBlock = (await factory.deploymentTransaction().wait()).blockNumber;
  console.log(`factory ${await factory.getAddress()}\ndesk    ${await desk.getAddress()}`);

  const prices = await fetchPrices();
  console.log("prices", prices);
  const baskets = [];
  for (const seed of SEEDS) {
    const recipe = recipeFor(seed, prices);
    const tx = await factory.createBasket(seed.name, seed.symbol, seed.feeBps, recipe);
    await tx.wait();
    const addr = await factory.basketOf(deployer.address, ethers.keccak256(ethers.toUtf8Bytes(seed.symbol)));
    baskets.push({ symbol: seed.symbol, address: addr });
    console.log(`basket  ${seed.symbol.padEnd(6)} ${addr}`);
  }

  const out = {
    chainId: Number(network.config.chainId ?? (await ethers.provider.getNetwork()).chainId),
    factory: await factory.getAddress(),
    desk: await desk.getAddress(),
    usdg: USDG,
    startBlock,
    deployer: deployer.address,
    baskets,
    deployedAt: new Date().toISOString(),
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${network.name}.json`), JSON.stringify(out, null, 2));
  // The web app reads its addresses from here.
  fs.writeFileSync(path.join(__dirname, "..", "..", "web", "lib", "deployment.json"), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`wrote deployments/${network.name}.json and web/lib/deployment.json`);

  // Seed liquidity: mint a few shares of each basket so the vaults are not empty.
  if (process.env.SEED_SHARES) {
    const erc = (a) => ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", a);
    for (const b of baskets) {
      const basket = await ethers.getContractAt("Basket", b.address);
      const shares = ethers.parseEther(process.env.SEED_SHARES);
      for (const c of await basket.components()) {
        await (await (await erc(c.token)).approve(b.address, ethers.MaxUint256)).wait();
      }
      await (await basket.mint(shares, deployer.address)).wait();
      console.log(`seeded  ${b.symbol} with ${process.env.SEED_SHARES} shares`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
