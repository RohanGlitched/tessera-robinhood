// Redeploys only the CreationDesk (e.g. to point at a different USDG) against the
// existing factory, and updates the deployment files the web app reads.
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");
const { USDG } = require("./robinhood");

async function main() {
  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  const desk = await (await ethers.getContractFactory("CreationDesk")).deploy(USDG, d.factory);
  await desk.waitForDeployment();
  d.desk = await desk.getAddress();
  d.usdg = USDG;
  fs.writeFileSync(file, JSON.stringify(d, null, 2));
  fs.writeFileSync(path.join(__dirname, "..", "..", "web", "lib", "deployment.json"), `${JSON.stringify(d, null, 2)}\n`);
  console.log(`desk ${d.desk} (USDG ${USDG})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
