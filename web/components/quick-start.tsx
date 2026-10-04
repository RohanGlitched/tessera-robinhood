"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "./wallet";
import { requestTestTokens } from "@/lib/faucet";
import { DEPLOYMENT } from "@/lib/chain";

/** The basket a first-time visitor lands on. */
export const WELCOME_BASKET = DEPLOYMENT.baskets[0]?.address;

/**
 * One click from the hero to a funded wallet on a live basket. Makes a
 * throwaway key in this browser (nothing to install), then hands over to the
 * basket page, which asks the faucet for test tokens and explains what to try.
 */
export function QuickStart({ className = "" }: { className?: string }) {
  const w = useWallet();
  const router = useRouter();
  if (!WELCOME_BASKET) return null;
  return (
    <button
      id="quick-start"
      onClick={() => {
        if (!w.address) w.useTestWallet();
        router.push(`/basket/${WELCOME_BASKET}?welcome=1`);
      }}
      className={`group inline-flex items-center gap-3 border border-gold/70 bg-ground-raised px-5 py-3 text-left text-sm text-ivory transition-colors hover:border-gold ${className}`}
    >
      <span className="live-dot size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
      <span>
        <span className="block font-medium">Try it in one minute</span>
        <span className="block text-xs text-ivory-dim">No wallet, no sign-up. We fund a test wallet for you.</span>
      </span>
    </button>
  );
}

type Stage = "wallet" | "funding" | "ready" | "failed";

const STEPS: [string, string][] = [
  ["Mint in kind", "Deposit the five stocks the recipe names and receive a share."],
  ["Buy with USDG", "Escrow USDG and watch a participant deliver the stocks for you."],
  ["Redeem", "Burn a share and take the stocks back out of the vault."],
];

/**
 * Shown on a basket page reached from Quick start. Funds the wallet once,
 * reports what arrived, and lays out the three things worth trying.
 */
export function WelcomeBanner({ symbol }: { symbol: string }) {
  const w = useWallet();
  const [stage, setStage] = useState<Stage>("wallet");
  const [note, setNote] = useState<string | null>(null);
  const [landed, setLanded] = useState<{ sent: string[]; skipped: string[] } | null>(null);
  const [hidden, setHidden] = useState(false);
  const asked = useRef<string | null>(null);

  useEffect(() => {
    if (!w.address || asked.current === w.address) return;
    asked.current = w.address;
    let alive = true;
    setStage("funding");
    requestTestTokens(w.address)
      .then((r) => {
        if (!alive) return;
        setNote(r.note);
        setLanded({ sent: r.sent, skipped: r.skipped });
        setStage(r.funded ? "ready" : "failed");
        w.refresh();
      })
      .catch((e: Error) => {
        if (!alive) return;
        setNote(e.message);
        setStage("failed");
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.address]);

  if (hidden) return null;

  const headline =
    stage === "wallet"
      ? "Making a test wallet in this browser…"
      : stage === "funding"
        ? "Sending test ETH, stock tokens and USDG to your wallet…"
        : stage === "ready"
          ? "Your test wallet is funded. You are on a live basket."
          : "The faucet could not fund your wallet.";

  return (
    <div className="mb-8 border border-gold/50 bg-ground" role="status" aria-live="polite">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs text-gold">
            <span className={`size-1.5 rounded-full bg-gold ${stage === "ready" || stage === "failed" ? "" : "live-dot"}`} aria-hidden />
            Quick start
          </p>
          <p className="display mt-1.5 text-xl text-ivory sm:text-2xl">{headline}</p>
          <p className="mt-1.5 text-sm text-ivory-dim">
            {stage === "wallet" && "A throwaway key kept only in this browser. Nothing to install."}
            {stage === "funding" && "Six small transfers on Robinhood Chain. This takes about half a minute."}
            {stage === "ready" && (landed?.sent.length ? "Everything below is real: the vault, the shares and the prices." : note)}
            {stage === "failed" && note}
          </p>
          {(stage === "funding" || (stage === "ready" && landed?.sent.length)) && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Test tokens">
              {(stage === "funding" ? ["ETH for gas", "0.1 TSLA", "0.1 AMZN", "0.1 AMD", "0.1 PLTR", "0.1 NFLX", "USDG"] : landed!.sent).map((what, i) => (
                <li
                  key={what}
                  className={`tnum border px-2 py-1 text-xs ${stage === "funding" ? "skeleton border-rule text-transparent" : "chip-in border-gold/50 bg-ground-raised text-ivory"}`}
                  style={{ "--i": i } as React.CSSProperties}
                >
                  {what}
                </li>
              ))}
              {stage === "ready" &&
                landed!.skipped.map((what) => (
                  <li key={what} className="border border-dashed border-rule-bright px-2 py-1 text-xs text-ivory-faint" title="The faucet is out of this for now">
                    {what} later
                  </li>
                ))}
            </ul>
          )}
          {stage === "failed" && (
            <button
              onClick={() => {
                asked.current = null;
                setStage("wallet");
                w.refresh();
              }}
              className="mt-3 border border-rule-bright px-3 py-1.5 text-xs text-ivory hover:border-ivory-faint"
            >
              Try again
            </button>
          )}
        </div>
        <button onClick={() => setHidden(true)} className="shrink-0 px-2 py-1 text-xs text-ivory-faint hover:text-ivory" aria-label="Dismiss">
          Dismiss
        </button>
      </div>
      <ol className="grid gap-px border-t border-rule bg-rule sm:grid-cols-3">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="bg-ground-deep px-5 py-3.5">
            <p className="text-sm text-ivory">
              <span className="tnum mr-2 text-gold">{i + 1}</span>
              {title}
              {i === 0 && <span className="text-ivory-faint"> · start here with 1 {symbol}</span>}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ivory-faint">{body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
