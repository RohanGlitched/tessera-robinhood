import { NextResponse } from "next/server";
import { createWalletClient, erc20Abi, formatUnits, http, maxUint256, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { basketAbi, creationDeskAbi } from "@/lib/abi";
import { DEPLOYMENT, IS_DEPLOYED, publicClient, robinhoodTestnet } from "@/lib/chain";
import { fetchQuotes } from "@/lib/quotes";
import { stockByAddress, USDG } from "@/lib/tokens";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tessera's own authorised participant.
 *
 * On a real market, firms holding the underlying stocks watch the creation desk
 * and fill orders that pay at least fair value, pocketing the premium. On the
 * testnet nobody is watching yet, so this route plays that role with the project
 * wallet: it reads the open orders, prices each one against live Robinhood
 * quotes, and fills every order that pays at least `MIN_OF_FAIR` of the stocks'
 * value. The USDG it earns flows back into the faucet that funds judges.
 *
 * It is a convenience, not a privilege: the desk contract lets anyone fill an
 * order and this wallet has no special rights on chain.
 */
const MIN_OF_FAIR = 0.98;
const MAX_FILLS_PER_CALL = 3;
const LOOKBACK = 40;

type Skip = { id: number; reason: string };
type Fill = { id: number; hash: `0x${string}`; shares: string; usdg: string };

// Per-instance guard against two overlapping sweeps racing for the same order.
const inFlight = new Set<number>();


export async function POST(req: Request) {
  const key = (process.env.PARTICIPANT_PRIVATE_KEY ?? process.env.FAUCET_PRIVATE_KEY) as `0x${string}` | undefined;
  if (!key || !IS_DEPLOYED) {
    return NextResponse.json({ error: "No participant is configured on this deployment." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { id?: number };
  const only = typeof body.id === "number" && Number.isInteger(body.id) && body.id >= 0 ? body.id : null;

  const desk = { address: DEPLOYMENT.desk, abi: creationDeskAbi } as const;
  const count = Number(await publicClient.readContract({ ...desk, functionName: "orderCount" }));
  const ids = only !== null ? (only < count ? [only] : []) : Array.from({ length: Math.min(count, LOOKBACK) }, (_, i) => count - 1 - i);
  if (!ids.length) return NextResponse.json({ filled: [], skipped: [], open: 0 });

  const orders = await publicClient.multicall({
    allowFailure: false,
    contracts: ids.map((id) => ({ ...desk, functionName: "getOrder" as const, args: [BigInt(id)] as const })),
  });
  const now = Math.floor(Date.now() / 1000);
  const open = ids
    .map((id, i) => ({ id, o: orders[i] }))
    .filter(({ o }) => Number(o.status) === 1 && Number(o.expiry) > now + 20);
  if (!open.length) return NextResponse.json({ filled: [], skipped: [], open: 0 });

  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: robinhoodTestnet, transport: http() });
  const quotes = await fetchQuotes();

  const filled: Fill[] = [];
  const skipped: Skip[] = [];

  for (const { id, o } of open) {
    if (filled.length >= MAX_FILLS_PER_CALL) break;
    if (inFlight.has(id)) {
      skipped.push({ id, reason: "already being filled" });
      continue;
    }
    inFlight.add(id);
    try {
      const basket = { address: o.basket as Address, abi: basketAbi } as const;
      const [comps, amounts] = await Promise.all([
        publicClient.readContract({ ...basket, functionName: "components" }),
        publicClient.readContract({ ...basket, functionName: "previewMint", args: [o.shares] }),
      ]);

      // Fair value of the stocks this order asks for, at live Robinhood quotes.
      let fair = 0;
      let missing: string | null = null;
      for (let i = 0; i < comps.length; i++) {
        const stock = stockByAddress(comps[i].token);
        const q = stock && quotes[stock.symbol];
        if (!q) {
          missing = stock?.symbol ?? comps[i].token;
          break;
        }
        fair += Number(formatUnits(amounts[i], 18)) * q.mid;
      }
      if (missing) {
        skipped.push({ id, reason: `no live quote for ${missing}` });
        continue;
      }
      const pays = Number(formatUnits(o.usdgAmount, USDG.decimals));
      if (pays < fair * MIN_OF_FAIR) {
        skipped.push({ id, reason: `pays ${pays.toFixed(2)} USDG for stocks worth ${fair.toFixed(2)}` });
        continue;
      }

      // Does the participant hold the stocks, and has it approved the desk?
      const tokens = comps.map((c) => c.token as Address);
      const state = await publicClient.multicall({
        allowFailure: false,
        contracts: [
          ...tokens.map((t) => ({ address: t, abi: erc20Abi, functionName: "balanceOf" as const, args: [account.address] as const })),
          ...tokens.map((t) => ({ address: t, abi: erc20Abi, functionName: "allowance" as const, args: [account.address, DEPLOYMENT.desk] as const })),
        ],
      });
      const held = state.slice(0, tokens.length) as bigint[];
      const allowed = state.slice(tokens.length) as bigint[];
      const short = tokens.map((t, i) => (held[i] < amounts[i] ? stockByAddress(t)?.symbol ?? t : null)).filter(Boolean);
      if (short.length) {
        skipped.push({ id, reason: `participant is out of ${short.join(", ")}` });
        continue;
      }

      let nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
      for (let i = 0; i < tokens.length; i++) {
        if (allowed[i] >= amounts[i]) continue;
        const hash = await wallet.writeContract({
          address: tokens[i],
          abi: erc20Abi,
          functionName: "approve",
          args: [DEPLOYMENT.desk, maxUint256],
          nonce: nonce++,
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      const { request } = await publicClient.simulateContract({
        ...desk,
        functionName: "fill",
        args: [BigInt(id)],
        account,
      });
      const hash = await wallet.writeContract({ ...request, nonce: nonce++ });
      await publicClient.waitForTransactionReceipt({ hash });
      filled.push({ id, hash, shares: formatUnits(o.shares, 18), usdg: pays.toFixed(2) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      skipped.push({ id, reason: /NotOpen/.test(msg) ? "filled by someone else first" : msg.split("\n")[0].slice(0, 160) });
    } finally {
      inFlight.delete(id);
    }
  }

  return NextResponse.json({ participant: account.address, open: open.length, filled, skipped });
}

/** Same sweep over every open order; handy for a cron or a curl. */
export async function GET() {
  return POST(new Request("http://participant", { method: "POST", body: "{}" }));
}
