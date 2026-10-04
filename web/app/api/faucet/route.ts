import { NextResponse } from "next/server";
import {
  createWalletClient,
  erc20Abi,
  http,
  isAddress,
  parseEther,
  parseUnits,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient, robinhoodTestnet } from "@/lib/chain";
import { STOCKS, USDG } from "@/lib/tokens";

export const dynamic = "force-dynamic";

/**
 * Test tokens for anyone trying Tessera: a little ETH for gas, enough of each
 * stock token to mint a few shares of every seed basket, and some USDG for the
 * creation desk. Drawn from a testnet-only wallet the team tops up from the
 * Robinhood Chain faucet.
 */
const GAS = parseEther(process.env.FAUCET_GAS_ETH ?? "0.0004");
const STOCK = parseEther("0.1");
const CASH = parseUnits("15", USDG.decimals);

// Per-instance memory. Good enough to stop a double click; the on-chain balance
// check below is what actually stops a wallet coming back for more.
const served = new Map<string, number>();

export async function POST(req: Request) {
  const key = process.env.FAUCET_PRIVATE_KEY as `0x${string}` | undefined;
  if (!key) {
    return NextResponse.json({ error: "The test faucet is not configured on this deployment." }, { status: 503 });
  }
  const { address } = (await req.json().catch(() => ({}))) as { address?: string };
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Send a valid wallet address." }, { status: 400 });
  }
  const to = address as Address;
  const last = served.get(to.toLowerCase());
  if (last && Date.now() - last < 10 * 60_000) {
    return NextResponse.json({ error: "This wallet was topped up a few minutes ago." }, { status: 429 });
  }

  const tokens = [...STOCKS.map((s) => s.address), USDG.address];
  const [eth, ...held] = await Promise.all([
    publicClient.getBalance({ address: to }),
    ...tokens.map((t) => publicClient.readContract({ address: t, abi: erc20Abi, functionName: "balanceOf", args: [to] })),
  ]);
  const stocksLow = held.slice(0, STOCKS.length).some((b) => b < STOCK / 2n);
  const cashLow = held[STOCKS.length] < CASH / 2n;
  if (eth >= GAS / 2n && !stocksLow && !cashLow) {
    return NextResponse.json({ error: "This wallet already has test tokens." }, { status: 429 });
  }
  served.set(to.toLowerCase(), Date.now());

  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: robinhoodTestnet, transport: http() });
  let nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });

  const sent: { what: string; hash: `0x${string}` }[] = [];
  const skipped: string[] = [];
  const faucetBalances = await Promise.all(
    tokens.map((t) =>
      publicClient.readContract({ address: t, abi: erc20Abi, functionName: "balanceOf", args: [account.address] }),
    ),
  );

  if (eth < GAS / 2n) {
    sent.push({ what: "ETH for gas", hash: await wallet.sendTransaction({ to, value: GAS, nonce: nonce++ }) });
  }
  for (let i = 0; i < STOCKS.length; i++) {
    if (held[i] >= STOCK / 2n) continue;
    if (faucetBalances[i] < STOCK) {
      skipped.push(STOCKS[i].symbol);
      continue;
    }
    const hash = await wallet.writeContract({
      address: STOCKS[i].address,
      abi: erc20Abi,
      functionName: "transfer",
      args: [to, STOCK],
      nonce: nonce++,
    });
    sent.push({ what: `0.1 ${STOCKS[i].symbol}`, hash });
  }
  if (cashLow) {
    // Hand out the full drip while it lasts, then whatever is left down to a
    // useful minimum. Fills on the creation desk pay USDG back into this wallet.
    const available = faucetBalances[STOCKS.length];
    const drip = available >= CASH ? CASH : available >= CASH / 3n ? available : 0n;
    if (drip > 0n) {
      const hash = await wallet.writeContract({
        address: USDG.address,
        abi: erc20Abi,
        functionName: "transfer",
        args: [to, drip],
        nonce: nonce++,
      });
      sent.push({ what: `${Number(drip) / 10 ** USDG.decimals} USDG`, hash });
    } else skipped.push("USDG");
  }

  await Promise.all(sent.map((s) => publicClient.waitForTransactionReceipt({ hash: s.hash })));
  return NextResponse.json({ sent, skipped });
}
