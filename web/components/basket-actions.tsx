"use client";

import { useEffect, useState } from "react";
import { parseEventLogs, parseUnits, type Abi } from "viem";
import { useWallet, explain } from "./wallet";
import { usePrices } from "./prices";
import { basketAbi, creationDeskAbi } from "@/lib/abi";
import { DEPLOYMENT, explorerTx, publicClient } from "@/lib/chain";
import { ensureAllowances } from "@/lib/approvals";
import { navPerShare, tokenAmount, useBalances, ONE_SHARE, type BasketInfo } from "@/lib/baskets";
import { money, quantity, percent } from "@/lib/format";
import { who } from "./orders-table";
import { USDG } from "@/lib/tokens";
import { BrandMark } from "./brand-mark";

type Tab = "mint" | "redeem" | "buy";

/** Shares as raw units; anything that is not a positive plain decimal is zero. */
const toShares = (v: string) => {
  if (!/^\d*\.?\d*$/.test(v.trim())) return 0n;
  try {
    const n = parseUnits((v.trim() || "0") as `${number}`, 18);
    return n > 0n ? n : 0n;
  } catch {
    return 0n;
  }
};

const HINTS: Record<Tab, (n: number) => string> = {
  mint: (n) => `Deposit the ${n} ${n === 1 ? "stock" : "stocks"} the recipe names and receive shares. No cash and no price is involved: that is what "in kind" means.`,
  redeem: () => "Burn shares and take the stocks back out of the vault, in proportion to what you burn.",
  buy: () => "Pay in USDG, Paxos's dollar stablecoin. It waits in escrow until someone holding the stocks delivers them for a small premium, the way an ETF's authorised participants work.",
};

const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;

export function BasketActions({ basket }: { basket: BasketInfo }) {
  const w = useWallet();
  const { prices } = usePrices();
  const [tab, setTab] = useState<Tab>("mint");
  const [amount, setAmount] = useState("1");
  const [premium, setPremium] = useState(1);
  const [step, setStep] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string; hash?: string; pending?: boolean } | null>(null);
  /** A USDG order we placed and are watching for a fill. */
  const [watch, setWatch] = useState<{ id: number; shares: bigint; since: number } | null>(null);

  const tokens = [...basket.components.map((c) => c.token), basket.address, USDG.address];
  const bal = useBalances(tokens, w.address, w.nonce);
  const shares = toShares(amount);
  const nav = navPerShare(basket, prices);
  const held = bal[basket.address.toLowerCase()] ?? 0n;
  const usdgHeld = bal[USDG.address.toLowerCase()] ?? 0n;

  const need = basket.components.map((c) => ceilDiv(c.unitsPerShare * shares, ONE_SHARE));
  const out = basket.components.map((c) => (c.unitsPerShare * shares) / ONE_SHARE);
  const fee = (shares * BigInt(basket.feeBps)) / 10_000n;
  const usdgCost = nav ? (nav * tokenAmount(shares) * (1 + premium / 100)) : 0;
  const usdgRaw = parseUnits(usdgCost.toFixed(6) as `${number}`, USDG.decimals);

  const short = basket.components
    .map((c, i) => ({ c, i }))
    .filter(({ c, i }) => (bal[c.token.toLowerCase()] ?? 0n) < need[i]);

  async function run(fn: () => Promise<`0x${string}`>, done: string) {
    setResult(null);
    try {
      const hash = await fn();
      setResult({ ok: true, text: done, hash });
    } catch (e) {
      setResult({ ok: false, text: explain(e) });
    } finally {
      setStep(null);
    }
  }

  const mint = () =>
    run(async () => {
      await ensureAllowances(
        w.write,
        w.address!,
        basket.address,
        basket.components.map((c, i) => ({ token: c.token, amount: need[i], label: c.stock?.symbol ?? "token" })),
        setStep,
      );
      setStep(`Minting ${amount} ${basket.symbol}`);
      return w.write({ address: basket.address, abi: basketAbi as Abi, functionName: "mint", args: [shares, w.address] });
    }, `Minted ${quantity(tokenAmount(shares - fee), 4)} ${basket.symbol}${fee ? ` (${quantity(tokenAmount(fee), 4)} to the creator as their fee)` : ""}.`);

  const redeem = () =>
    run(async () => {
      setStep(`Redeeming ${amount} ${basket.symbol}`);
      return w.write({ address: basket.address, abi: basketAbi as Abi, functionName: "redeem", args: [shares, w.address] });
    }, `Redeemed ${amount} ${basket.symbol}. The stock tokens are in your wallet.`);

  async function buy() {
    setResult(null);
    setWatch(null);
    try {
      await ensureAllowances(w.write, w.address!, DEPLOYMENT.desk, [{ token: USDG.address, amount: usdgRaw, label: "USDG" }], setStep);
      setStep("Placing the order");
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 24 * 3600);
      const hash = await w.write({
        address: DEPLOYMENT.desk,
        abi: creationDeskAbi as Abi,
        functionName: "placeOrder",
        args: [basket.address, shares, usdgRaw, expiry],
      });
      const receipt = await publicClient.getTransactionReceipt({ hash });
      const [placed] = parseEventLogs({ abi: creationDeskAbi, eventName: "OrderPlaced", logs: receipt.logs });
      const id = placed ? Number(placed.args.id) : null;
      setResult({
        ok: true,
        pending: id !== null,
        hash,
        text: `Order${id !== null ? ` #${id}` : ""} placed. ${quantity(usdgCost, 2)} USDG is in escrow. Waiting for a participant to deliver the stocks…`,
      });
      if (id !== null) setWatch({ id, shares, since: Date.now() });
    } catch (e) {
      setResult({ ok: false, text: explain(e) });
    } finally {
      setStep(null);
    }
  }

  // Nudge Tessera's participant, then watch the order until it is filled.
  useEffect(() => {
    if (!watch) return;
    let alive = true;
    let fillHash: string | undefined;
    const { id, shares: ordered, since } = watch;
    const deliveredText = (filler: string) =>
      `Filled by ${who(filler)}. ${quantity(tokenAmount(ordered - (ordered * BigInt(basket.feeBps)) / 10_000n), 4)} ${basket.symbol} is in your wallet and your USDG paid for the stocks.`;

    fetch("/api/participant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) })
      .then((r) => r.json())
      .then((j: { filled?: { id: number; hash: string }[]; skipped?: { id: number; reason: string }[] }) => {
        if (!alive) return;
        fillHash = j.filled?.find((f) => f.id === id)?.hash;
        const skip = j.skipped?.find((f) => f.id === id);
        if (skip && !fillHash)
          setResult((r) => r && { ...r, text: `Order #${id} is open. The house participant passed (${skip.reason}); anyone holding the stocks can still fill it from the desk below.` });
      })
      .catch(() => {});

    const tick = async () => {
      try {
        const o = await publicClient.readContract({ address: DEPLOYMENT.desk, abi: creationDeskAbi, functionName: "getOrder", args: [BigInt(id)] });
        if (!alive) return;
        if (Number(o.status) === 2) {
          setResult({ ok: true, text: deliveredText(o.filler), hash: fillHash });
          setWatch(null);
          w.refresh();
          // The RPC's read replicas can lag the receipt by a block or two.
          setTimeout(() => w.refresh(), 4000);
          return;
        }
        if (Number(o.status) === 3) {
          setResult({ ok: true, text: `Order #${id} was cancelled and the USDG returned.` });
          setWatch(null);
          w.refresh();
          return;
        }
      } catch {
        /* keep polling */
      }
      if (Date.now() - since > 150_000) {
        setResult((r) => r && { ...r, pending: false, text: `Order #${id} is still open. It stays on the desk for 24 hours; cancel any time for a full refund.` });
        setWatch(null);
        return;
      }
      if (alive) timer = setTimeout(tick, 2500);
    };
    let timer = setTimeout(tick, 2500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);

  const disabled = !w.address || shares === 0n || step !== null;
  let reason: string | null = null;
  if (w.address && amount.trim() && shares === 0n) reason = "Enter a positive number of shares, like 0.5.";
  if (w.address && shares > 0n) {
    if (tab === "mint" && short.length) reason = `You need more ${short.map((s) => s.c.stock?.symbol).join(", ")}. Use Get test tokens in the wallet menu, or buy with USDG instead.`;
    if (tab === "redeem" && shares > held) reason = `You hold ${quantity(tokenAmount(held), 4)} ${basket.symbol}.`;
    if (tab === "buy" && usdgRaw > usdgHeld) reason = `You hold ${quantity(tokenAmount(usdgHeld, 6), 2)} USDG.`;
    if (tab === "buy" && !nav) reason = "Waiting for live prices.";
  }

  return (
    <div className="border border-rule bg-ground">
      <div className="grid grid-cols-3 border-b border-rule" role="tablist">
        {(
          [
            ["mint", "Mint in kind"],
            ["redeem", "Redeem"],
            ["buy", "Buy with USDG"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            id={`tab-${t}`}
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              setResult(null);
            }}
            className={`py-3 text-sm ${tab === t ? "bg-ground-raised text-ivory" : "text-ivory-dim hover:text-ivory"}`}
          >
            {label}
            {tab === t && <span className="mx-auto mt-1 block h-px w-8 bg-gold" aria-hidden />}
          </button>
        ))}
      </div>

      <div className="p-5">
        <p className="mb-4 text-xs leading-relaxed text-ivory-faint">{HINTS[tab](basket.components.length)}</p>
        <label className="block">
          <span className="flex justify-between text-sm text-ivory">
            Shares
            {tab === "redeem" && (
              <button onClick={() => setAmount(tokenAmount(held).toString())} className="text-xs text-ivory-dim hover:text-ivory">
                Max {quantity(tokenAmount(held), 4)}
              </button>
            )}
          </span>
          <input
            id="share-amount"
            type="number"
            min={0}
            step="0.1"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setResult(null);
            }}
            className="tnum mt-2 w-full border border-rule-bright bg-ground-deep px-3 py-3 text-2xl text-ivory outline-none focus:border-gold"
          />
        </label>
        <p className="tnum mt-2 text-sm text-ivory-faint">≈ {money(nav ? nav * Number(amount || 0) : null)} at live prices</p>

        {tab !== "buy" ? (
          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ivory-faint">
                <th className="pb-2 font-normal">{tab === "mint" ? "You deposit" : "You receive"}</th>
                <th className="pb-2 text-right font-normal">Tokens</th>
                {tab === "mint" && <th className="pb-2 text-right font-normal">You hold</th>}
              </tr>
            </thead>
            <tbody>
              {basket.components.map((c, i) => {
                const mine = bal[c.token.toLowerCase()] ?? 0n;
                const low = tab === "mint" && w.address && mine < need[i];
                return (
                  <tr key={c.token} className="border-t border-rule">
                    <td className="py-2 text-ivory">
                      <span className="flex items-center gap-2">
                        <BrandMark symbol={c.stock?.symbol ?? ""} className="size-3.5 text-ivory-dim" />
                        {c.stock?.symbol}
                      </span>
                    </td>
                    <td className="tnum py-2 text-right text-ivory">{quantity(tokenAmount(tab === "mint" ? need[i] : out[i]), 6)}</td>
                    {tab === "mint" && (
                      <td className={`tnum py-2 text-right ${low ? "text-loss" : "text-ivory-dim"}`}>
                        {w.address ? quantity(tokenAmount(mine), 4) : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="mt-5 space-y-4 text-sm">
            <label className="block">
              <span className="text-ivory">Premium you offer over live value: {percent(premium, 1)}</span>
              <input
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={premium}
                onChange={(e) => setPremium(Number(e.target.value))}
                className="slider mt-3 w-full"
                style={{ "--fill": "var(--color-gold)", "--filled": `${(premium / 5) * 100}%` } as React.CSSProperties}
                aria-label="Premium"
              />
              <span className="mt-1 block text-xs text-ivory-faint">
                A participant who holds the stocks earns this for delivering them. Real ETF creations work the same way.
              </span>
            </label>
            <div className="flex justify-between border-t border-rule pt-3">
              <span className="text-ivory-dim">You escrow</span>
              <span className="tnum text-ivory">{quantity(usdgCost, 2)} USDG</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ivory-dim">You hold</span>
              <span className="tnum text-ivory-dim">{w.address ? `${quantity(tokenAmount(usdgHeld, 6), 2)} USDG` : "—"}</span>
            </div>
            <p className="text-xs leading-relaxed text-ivory-faint">
              Your USDG stays in the desk contract until a participant delivers the stock tokens. The
              basket mints your shares straight to you. Cancel at any time for a full refund.
            </p>
          </div>
        )}

        {tab === "mint" && fee > 0n && (
          <p className="mt-3 text-xs text-ivory-faint">
            The creator keeps {percent(basket.feeBps / 100, 2)} of new shares as their fee. The vault is never touched.
          </p>
        )}

        {reason && !result?.ok && <p className="mt-4 break-words text-sm text-loss">{reason}</p>}

        <button
          id="action-submit"
          onClick={() => (!w.address ? w.useTestWallet() : tab === "mint" ? mint() : tab === "redeem" ? redeem() : buy())}
          disabled={w.address ? disabled || !!reason : false}
          className="mt-5 w-full bg-gold px-5 py-3.5 text-sm font-medium text-ground-deep disabled:opacity-50"
        >
          {!w.address
            ? "Use a test wallet"
            : step
              ? `${step}…`
              : tab === "mint"
                ? `Mint ${amount || 0} ${basket.symbol}`
                : tab === "redeem"
                  ? `Redeem ${amount || 0} ${basket.symbol}`
                  : `Place USDG order`}
        </button>

        {result && (
          <p className={`mt-4 break-words text-sm ${result.ok ? "text-gain" : "text-loss"}`} role="status">
            {result.pending && <span className="live-dot mr-2 inline-block size-1.5 rounded-full bg-gain align-middle" aria-hidden />}
            {result.text}{" "}
            {result.hash && (
              <a href={explorerTx(result.hash)} target="_blank" rel="noreferrer" className="underline decoration-rule-bright underline-offset-4 hover:text-ivory">
                View transaction
              </a>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
