"use client";

import { useState } from "react";
import { explorerTx } from "@/lib/chain";

/** Shown once after publishing: proof of the transaction and a way to share the page. */
export function CreatedBanner({ hash }: { hash: string | null }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.split("?")[0]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the address bar still works */
    }
  };
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-gain/40 bg-ground-raised px-4 py-3 text-sm text-ivory" role="status">
      <p>
        Your basket is live on Robinhood Chain. Mint the first shares below, or share this page.
        {hash && (
          <>
            {" "}
            <a href={explorerTx(hash)} target="_blank" rel="noreferrer" className="underline decoration-rule-bright underline-offset-4 hover:text-gold">
              View the publish transaction
            </a>
          </>
        )}
      </p>
      <button onClick={copy} className="border border-rule-bright px-3 py-1.5 text-xs text-ivory-dim hover:text-ivory">
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
