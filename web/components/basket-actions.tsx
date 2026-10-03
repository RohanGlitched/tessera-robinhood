"use client";

import { useState } from "react";
import { parseUnits, type Abi } from "viem";
import { useWallet, explain } from "./wallet";
import { usePrices } from "./prices";
import { basketAbi, creationDeskAbi } from "@/lib/abi";
import { DEPLOYMENT, explorerTx } from "@/lib/chain";
import { ensureAllowances } from "@/lib/approvals";
import { navPerShare, tokenAmount, useBalances, ONE_SHARE, type BasketInfo } from "@/lib/baskets";
import { money, quantity, percent } from "@/lib/format";
import { USDG } from "@/lib/tokens";
import { BrandMark } from "./brand-mark";

type Tab = "mint" | "redeem" | "buy";

const toShares = (v: string) => {
  try {
    return parseUnits((v || "0") as `${number}`, 18);
  } catch {
    return 0n;
  }
};

const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;

export function BasketActions({ basket }: { basket: BasketInfo }) {
  const w = useWallet();
  const { prices } = usePrices();
  const [tab, setTab] = useState<Tab>("mint");
  const [amount, setAmount] = useState("1");
  const [premium, setPremium] = useState(1);
  const [step, setStep] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string; hash?: string } | null>(null);

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

  const buy = () =>
    run(async () => {
      await ensureAllowances(w.write, w.address!, DEPLOYMENT.desk, [{ token: USDG.address, amount: usdgRaw, label: "USDG" }], setStep);
      setStep("Placing the order");
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 24 * 3600);
      return w.write({
        address: DEPLOYMENT.desk,
        abi: creationDeskAbi as Abi,
        functionName: "placeOrder",
        args: [basket.address, shares, usdgRaw, expiry],
      });
    }, `Order placed. ${quantity(usdgCost, 2)} USDG is in escrow until someone fills it or you cancel.`);

  const disabled = !w.address || shares === 0n || step !== null;
  let reason: string | null = null;
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

        {reason && !result?.ok && <p className="mt-4 text-sm text-loss">{reason}</p>}

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
          <p className={`mt-4 text-sm ${result.ok ? "text-gain" : "text-loss"}`} role="status">
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
