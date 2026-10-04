"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { keccak256, toBytes, type Address } from "viem";
import { BasketMosaic } from "@/components/basket-mosaic";
import { usePrices } from "@/components/prices";
import { useWallet, explain } from "@/components/wallet";
import { tesseraFactoryAbi } from "@/lib/abi";
import { DEPLOYMENT, IS_DEPLOYED, publicClient } from "@/lib/chain";
import { STOCKS } from "@/lib/tokens";
import { money, percent, quantity, signedPercent } from "@/lib/format";
import { slotColor, changeInk } from "@/lib/palette";
import { BrandMark } from "@/components/brand-mark";

type Pick = { symbol: string; weightBps: number };

/** Spread 10,000 bps as evenly as possible; the remainder goes to the first picks. */
function equalWeights(symbols: string[]): Pick[] {
  const n = symbols.length;
  const base = Math.floor(10_000 / n);
  let extra = 10_000 - base * n;
  return symbols.map((symbol) => ({ symbol, weightBps: base + (extra-- > 0 ? 1 : 0) }));
}

export default function Compose() {
  const router = useRouter();
  const { prices } = usePrices();
  const w = useWallet();
  const [picks, setPicks] = useState<Pick[]>(equalWeights(["TSLA", "AMD", "PLTR"]));
  const [name, setName] = useState("My Robinhood Basket");
  const [symbol, setSymbol] = useState("MINE");
  const [feeBps, setFeeBps] = useState(25);
  const [target, setTarget] = useState(10);
  const [status, setStatus] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });

  const total = picks.reduce((a, p) => a + p.weightBps, 0);
  const recipe = useMemo(
    () =>
      picks.map((p) => {
        const price = prices[p.symbol]?.mid ?? null;
        const usd = (target * p.weightBps) / 10_000;
        const units = price ? usd / price : null;
        return { ...p, price, usd, units };
      }),
    [picks, prices, target],
  );
  const ready = recipe.every((r) => r.units && r.units > 0);

  function toggle(sym: string) {
    const has = picks.some((p) => p.symbol === sym);
    const symbols = has ? picks.filter((p) => p.symbol !== sym).map((p) => p.symbol) : [...picks.map((p) => p.symbol), sym];
    setPicks(symbols.length ? equalWeights(symbols) : []);
  }

  function setWeight(sym: string, pct: number) {
    setPicks((ps) => ps.map((p) => (p.symbol === sym ? { ...p, weightBps: Math.round(Math.max(0, Math.min(100, pct)) * 100) } : p)));
  }

  function balance() {
    if (!total) return;
    const scaled = picks.map((p) => ({ ...p, weightBps: Math.floor((p.weightBps * 10_000) / total) }));
    const drift = 10_000 - scaled.reduce((a, p) => a + p.weightBps, 0);
    scaled[0].weightBps += drift;
    setPicks(scaled);
  }

  const problems: string[] = [];
  if (!picks.length) problems.push("Pick at least one stock.");
  if (picks.length && total !== 10_000) problems.push(`Weights add up to ${percent(total / 100, 2)}, not 100%.`);
  if (picks.some((p) => p.weightBps === 0)) problems.push("Every stock needs a weight above zero.");
  if (!name.trim() || name.length > 32) problems.push("Name must be 1 to 32 characters.");
  if (!/^[A-Z0-9]{1,10}$/.test(symbol)) problems.push("Symbol must be 1 to 10 capital letters or digits.");
  if (!(target > 0)) problems.push("Share value must be above zero.");

  async function create() {
    if (!w.address) return w.useTestWallet();
    setStatus({ busy: true, error: null });
    try {
      const args = recipe.map((r) => ({
        token: STOCKS.find((s) => s.symbol === r.symbol)!.address,
        unitsPerShare: BigInt(Math.round(r.units! * 1e12)) * 10n ** 6n,
        weightBps: r.weightBps,
      }));
      const hash = await w.write({
        address: DEPLOYMENT.factory,
        abi: tesseraFactoryAbi,
        functionName: "createBasket",
        args: [name.trim(), symbol, feeBps, args],
      });
      const addr = (await publicClient.readContract({
        address: DEPLOYMENT.factory,
        abi: tesseraFactoryAbi,
        functionName: "basketOf",
        args: [w.address, keccak256(toBytes(symbol))],
      })) as Address;
      router.push(`/basket/${addr}?created=${hash}`);
    } catch (e) {
      setStatus({ busy: false, error: explain(e) });
    }
  }

  return (
    <section className="mx-auto grid max-w-[1400px] gap-12 px-5 pb-24 pt-14 sm:px-8 lg:grid-cols-[1fr_1fr] lg:pb-0">
      <div className="min-w-0">
        <h1 className="display text-title text-ivory">Compose a basket</h1>
        <p className="mt-3 max-w-[56ch] text-ivory-dim">
          Choose the stocks and their weights. The recipe is written to Robinhood Chain once and can
          never be changed, by you or anyone else.
        </p>

        <fieldset className="mt-10">
          <legend className="text-sm text-ivory">Stocks</legend>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {STOCKS.map((s) => {
              const on = picks.some((p) => p.symbol === s.symbol);
              const p = prices[s.symbol];
              return (
                <button
                  key={s.symbol}
                  id={`pick-${s.symbol}`}
                  onClick={() => toggle(s.symbol)}
                  aria-pressed={on}
                  className={`relative border p-2.5 text-left transition-colors sm:p-3 ${
                    on ? "border-gold bg-ground-raised" : "border-rule-bright hover:border-ivory-faint"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-sm text-ivory">{s.symbol}</span>
                    <BrandMark symbol={s.symbol} className={`size-4 ${on ? "text-gold" : "text-ivory-faint"}`} />
                  </span>
                  <span className="tnum mt-2 block text-[15px] text-ivory">{money(p?.mid)}</span>
                  <span className="tnum block text-xs" style={{ color: changeInk(p?.change24h) }}>
                    {p ? signedPercent(p.change24h) : " "}
                  </span>
                  {on && <span className="absolute inset-x-0 top-0 h-0.5 bg-gold" aria-hidden />}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <div className="flex items-baseline justify-between">
            <legend className="text-sm text-ivory">Weights</legend>
            <div className="flex gap-4 text-xs">
              <button onClick={() => setPicks(equalWeights(picks.map((p) => p.symbol)))} className="text-ivory-dim hover:text-ivory">
                Equal weight
              </button>
              <button onClick={balance} className="text-ivory-dim hover:text-ivory">
                Scale to 100%
              </button>
            </div>
          </div>
          <div className="mt-3 divide-y divide-rule border-y border-rule">
            {picks.map((p, i) => (
              <div key={p.symbol} className="grid grid-cols-[4.5rem_1fr_5.5rem] items-center gap-4 py-3">
                <span className="flex items-center gap-2 text-sm text-ivory">
                  <span className="size-2.5" style={{ background: slotColor(i) }} aria-hidden />
                  {p.symbol}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={p.weightBps / 100}
                  onChange={(e) => setWeight(p.symbol, Number(e.target.value))}
                  className="slider w-full"
                  style={{ "--fill": slotColor(i), "--filled": `${p.weightBps / 100}%` } as React.CSSProperties}
                  aria-label={`${p.symbol} weight`}
                />
                <label className="flex items-center border border-rule-bright bg-ground px-2">
                  <input
                    id={`weight-${p.symbol}`}
                    type="number"
                    step={0.01}
                    value={p.weightBps / 100}
                    onChange={(e) => setWeight(p.symbol, Number(e.target.value))}
                    className="w-full bg-transparent py-1.5 text-right text-sm text-ivory outline-none"
                  />
                  <span className="pl-1 text-xs text-ivory-faint">%</span>
                </label>
              </div>
            ))}
          </div>
          <p className={`tnum mt-2 text-right text-xs ${total === 10_000 ? "text-ivory-faint" : "text-loss"}`}>
            Total {percent(total / 100, 2)}
          </p>
        </fieldset>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-ivory">Name</span>
            <input id="basket-name" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} className="mt-2 w-full border border-rule-bright bg-ground px-3 py-2.5 text-ivory outline-none focus:border-gold" />
          </label>
          <label className="block">
            <span className="text-sm text-ivory">Symbol</span>
            <input id="basket-symbol" value={symbol} maxLength={10} onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} className="mt-2 w-full border border-rule-bright bg-ground px-3 py-2.5 uppercase text-ivory outline-none focus:border-gold" />
          </label>
          <label className="block">
            <span className="text-sm text-ivory">Value of one share</span>
            <span className="mt-2 flex items-center border border-rule-bright bg-ground px-3 focus-within:border-gold">
              <span className="text-ivory-faint">$</span>
              <input id="basket-target" type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="w-full bg-transparent px-1 py-2.5 text-ivory outline-none" />
            </span>
            <span className="mt-1 block text-xs text-ivory-faint">Sets how many tokens of each stock back one share, at today&apos;s prices.</span>
          </label>
          <label className="block">
            <span className="text-sm text-ivory">Your fee on new shares: {percent(feeBps / 100, 2)}</span>
            <input type="range" min={0} max={100} value={feeBps} onChange={(e) => setFeeBps(Number(e.target.value))} className="slider mt-4 w-full" style={{ "--fill": "var(--color-gold)", "--filled": `${feeBps}%` } as React.CSSProperties} aria-label="Creator fee" />
            <span className="mt-1 block text-xs text-ivory-faint">Paid in newly created shares, never taken from the vault. Capped at 1%.</span>
          </label>
        </div>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="border border-rule bg-ground p-5">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="display text-2xl text-ivory">{name || "Untitled"}</p>
              <p className="text-sm text-ivory-faint">${symbol || "—"}</p>
            </div>
            <p className="tnum display text-3xl text-ivory">{money(target)}</p>
          </div>
          <div className="mt-5">
            <BasketMosaic
              tiles={picks.map((p, i) => ({ key: p.symbol, label: p.symbol, sub: STOCKS.find((s) => s.symbol === p.symbol)?.name, weightBps: p.weightBps, slot: i }))}
              height={300}
              emptyHint="Pick a stock to lay the first tile."
            />
          </div>
          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ivory-faint">
                <th className="pb-2 font-normal">One share holds</th>
                <th className="pb-2 text-right font-normal">Tokens</th>
                <th className="pb-2 text-right font-normal">Value</th>
              </tr>
            </thead>
            <tbody>
              {recipe.map((r) => (
                <tr key={r.symbol} className="border-t border-rule">
                  <td className="py-2 text-ivory">{r.symbol}</td>
                  <td className="tnum py-2 text-right text-ivory-dim">{r.units ? quantity(r.units, 6) : "—"}</td>
                  <td className="tnum py-2 text-right text-ivory">{money(r.usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {problems.length > 0 && (
            <ul className="mt-5 space-y-1 text-sm text-loss">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {!IS_DEPLOYED && <p className="mt-5 text-sm text-loss">Contracts are not deployed on this build yet.</p>}
          <button
            id="create-basket"
            onClick={create}
            disabled={status.busy || problems.length > 0 || !ready || !IS_DEPLOYED}
            className="mt-6 w-full bg-gold px-5 py-3.5 text-sm font-medium text-ground-deep disabled:opacity-50"
          >
            {status.busy ? "Publishing the recipe…" : w.address ? "Publish basket" : "Use a test wallet to publish"}
          </button>
          {status.error && <p className="mt-3 text-sm text-loss">{status.error}</p>}
          <p className="mt-3 text-xs leading-relaxed text-ivory-faint">
            Publishing costs only gas. Anyone can then mint shares of your basket by depositing the
            stock tokens above.
          </p>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-rule bg-ground-deep/95 px-5 py-3 backdrop-blur-md lg:hidden">
        <div className="min-w-0">
          <p className="truncate text-sm text-ivory">{name || "Untitled"} <span className="text-ivory-faint">${symbol || "—"}</span></p>
          <p className={`tnum text-xs ${total === 10_000 ? "text-ivory-faint" : "text-loss"}`}>
            {picks.length} {picks.length === 1 ? "stock" : "stocks"} · weights {percent(total / 100, 0)} · {money(target)} a share
          </p>
        </div>
        <button
          onClick={create}
          disabled={status.busy || problems.length > 0 || !ready || !IS_DEPLOYED}
          className="shrink-0 bg-gold px-4 py-3 text-sm font-medium text-ground-deep disabled:opacity-50"
        >
          {status.busy ? "Publishing…" : w.address ? "Publish" : "Publish with a test wallet"}
        </button>
      </div>
    </section>
  );
}
