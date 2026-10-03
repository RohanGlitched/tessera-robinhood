"use client";

import { useEffect, useRef, useState } from "react";
import { formatEther } from "viem";
import { useWallet } from "./wallet";
import { publicClient, explorerAddress } from "@/lib/chain";
import { shortAddress } from "@/lib/format";

/**
 * One button for the whole wallet story. A judge with no wallet installed can
 * still try everything: "Use a test wallet" makes a throwaway key in this
 * browser, and "Get test tokens" fills it from the project faucet.
 */
export function ConnectButton() {
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const [eth, setEth] = useState<bigint | null>(null);
  const [faucet, setFaucet] = useState<{ busy: boolean; note: string | null }>({ busy: false, note: null });
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!w.address) return setEth(null);
    publicClient.getBalance({ address: w.address }).then(setEth).catch(() => {});
  }, [w.address, w.nonce]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function getTokens() {
    if (!w.address) return;
    setFaucet({ busy: true, note: null });
    try {
      const r = await fetch("/api/faucet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: w.address }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const got = (j.sent as { what: string }[]).map((s) => s.what).join(", ");
      setFaucet({
        busy: false,
        note: got
          ? `Sent ${got}.${j.skipped.length ? ` The faucet is out of ${j.skipped.join(", ")} for now.` : ""}`
          : "Nothing to send.",
      });
      w.refresh();
    } catch (e) {
      setFaucet({ busy: false, note: (e as Error).message });
    }
  }

  if (!w.address) {
    return (
      <div className="relative" ref={box}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="border border-gold/70 bg-ground-raised px-4 py-2 text-sm text-ivory transition-colors hover:border-gold"
          aria-expanded={open}
        >
          {w.connecting ? "Connecting…" : "Connect wallet"}
        </button>
        {open && (
          <div className="absolute right-0 z-50 mt-2 w-72 border border-rule-bright bg-ground-raised p-2 shadow-2xl">
            <button
              onClick={() => {
                setOpen(false);
                w.connectBrowserWallet();
              }}
              className="block w-full px-3 py-3 text-left hover:bg-ground-high"
            >
              <span className="block text-sm text-ivory">Browser wallet</span>
              <span className="block text-xs text-ivory-faint">MetaMask, Rabby or any injected wallet</span>
            </button>
            <button
              onClick={() => {
                setOpen(false);
                w.useTestWallet();
              }}
              className="block w-full px-3 py-3 text-left hover:bg-ground-high"
            >
              <span className="block text-sm text-ivory">Use a test wallet</span>
              <span className="block text-xs text-ivory-faint">
                A throwaway key kept in this browser. Nothing to install.
              </span>
            </button>
          </div>
        )}
        {w.error && (
          <p className="absolute right-0 mt-2 w-72 border border-loss/50 bg-ground-raised p-3 text-xs text-ivory">
            {w.error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 border border-rule-bright bg-ground-raised px-3 py-2 text-sm text-ivory hover:border-ivory-faint"
        aria-expanded={open}
      >
        <span className="live-dot size-1.5 rounded-full bg-gain" aria-hidden />
        <span className="tnum">{shortAddress(w.address, 6, 4)}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 border border-rule-bright bg-ground-raised p-4 shadow-2xl">
          <p className="text-xs text-ivory-faint">
            {w.mode === "test" ? "Test wallet in this browser" : "Browser wallet"} on Robinhood Chain testnet
          </p>
          <a
            href={explorerAddress(w.address)}
            target="_blank"
            rel="noreferrer"
            className="tnum mt-1 block break-all text-sm text-ivory hover:text-gold"
          >
            {w.address}
          </a>
          <p className="tnum mt-3 text-sm text-ivory-dim">
            {eth === null ? "—" : `${Number(formatEther(eth)).toFixed(5)} ETH for gas`}
          </p>
          <button
            onClick={getTokens}
            disabled={faucet.busy}
            className="mt-4 w-full bg-gold px-3 py-2.5 text-sm font-medium text-ground-deep disabled:opacity-60"
          >
            {faucet.busy ? "Sending test tokens…" : "Get test tokens"}
          </button>
          {faucet.note && <p className="mt-2 text-xs leading-relaxed text-ivory-dim">{faucet.note}</p>}
          <button
            onClick={() => {
              setOpen(false);
              w.disconnect();
            }}
            className="mt-3 w-full border border-rule-bright px-3 py-2 text-sm text-ivory-dim hover:text-ivory"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
