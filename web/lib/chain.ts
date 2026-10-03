import { defineChain, createPublicClient, http, type Address } from "viem";
import deployment from "./deployment.json";

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com"] } },
  blockExplorers: {
    default: { name: "Robinhood Explorer", url: "https://explorer.testnet.chain.robinhood.com" },
  },
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
  testnet: true,
});

export const publicClient = createPublicClient({
  chain: robinhoodTestnet,
  transport: http(undefined, { batch: true }),
});

export const DEPLOYMENT = deployment as {
  chainId: number;
  factory: Address;
  desk: Address;
  usdg: Address;
  startBlock: number;
  deployer: Address;
  baskets: { symbol: string; address: Address }[];
};

export const IS_DEPLOYED = DEPLOYMENT.factory !== "0x0000000000000000000000000000000000000000";

const EXPLORER = robinhoodTestnet.blockExplorers.default.url;
export const explorerAddress = (a: string) => `${EXPLORER}/address/${a}`;
export const explorerTx = (h: string) => `${EXPLORER}/tx/${h}`;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://robinhood.teserra.world";
