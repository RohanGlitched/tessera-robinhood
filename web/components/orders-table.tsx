"use client";

import { useState } from "react";
import Link from "next/link";
import type { Abi } from "viem";
import { useWallet, explain } from "./wallet";
import { creationDeskAbi, basketAbi } from "@/lib/abi";
import { DEPLOYMENT, publicClient } from "@/lib/chain";
import { ensureAllowances } from "@/lib/approvals";
import { tokenAmount, type DeskOrder, type BasketInfo } from "@/lib/baskets";
import { money, quantity, shortAddress, timeAgo } from "@/lib/format";
import { USDG } from "@/lib/tokens";

const STATUS = ["", "Open", "Filled", "Cancelled"];

/**
 * Creation desk orders. Anyone holding the components can fill an open order;
 * the buyer, or anyone once it expires, can cancel it.
 */
export function OrdersTable({
  orders,
  baskets,
  emptyText = "No orders yet.",
}: {
  orders: DeskOrder[] | null;
  baskets: Record<string, BasketInfo>;
  emptyText?: string;
}) {
  const w = useWallet();
  const [busy, setBusy] = useState<{ id: number; step: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = Date.now() / 1000;

  async function fill(o: DeskOrder) {
    if (!w.address) return w.useTestWallet();
    setError(null);
    try {
      const b = baskets[o.basket.toLowerCase()];
      const amounts = (await publicClient.readContract({
        address: o.basket,
        abi: basketAbi,
        functionName: "previewMint",
        args: [o.shares],
      })) as readonly bigint[];
      await ensureAllowances(
        w.write,
        w.address,
        DEPLOYMENT.desk,
        b.components.map((c, i) => ({ token: c.token, amount: amounts[i], label: c.stock?.symbol ?? "token" })),
        (step) => setBusy({ id: o.id, step }),
      );
      setBusy({ id: o.id, step: "Filling the order" });
      await w.write({ address: DEPLOYMENT.desk, abi: creationDeskAbi as Abi, functionName: "fill", args: [BigInt(o.id)] });
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(null);
    }
  }

  async function cancel(o: DeskOrder) {
    setError(null);
    setBusy({ id: o.id, step: "Cancelling" });
    try {
      await w.write({ address: DEPLOYMENT.desk, abi: creationDeskAbi as Abi, functionName: "cancel", args: [BigInt(o.id)] });
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(null);
    }
  }

  if (!orders) return <div className="skeleton h-32 border border-rule" />;
  if (!orders.length) return <p className="border border-dashed border-rule-bright p-6 text-sm text-ivory-dim">{emptyText}</p>;

  return (
    <div>
      {error && <p className="mb-3 text-sm text-loss">{error}</p>}
      <div className="overflow-x-auto border border-rule">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-xs text-ivory-faint">
              <th className="px-4 py-3 font-normal">Order</th>
              <th className="px-4 py-3 font-normal">Basket</th>
              <th className="px-4 py-3 text-right font-normal">Shares</th>
              <th className="px-4 py-3 text-right font-normal">Pays</th>
              <th className="px-4 py-3 text-right font-normal">Per share</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const b = baskets[o.basket.toLowerCase()];
              const shares = tokenAmount(o.shares);
              const usdg = tokenAmount(o.usdgAmount, USDG.decimals);
              const expired = o.status === 1 && now > o.expiry;
              const mine = w.address && o.buyer.toLowerCase() === w.address.toLowerCase();
              const label = expired ? "Expired" : STATUS[o.status];
              return (
                <tr key={o.id} className="border-t border-rule">
                  <td className="tnum px-4 py-3 text-ivory-dim">
                    #{o.id}
                    <span className="block text-xs text-ivory-faint">by {shortAddress(o.buyer, 6, 4)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/basket/${o.basket}`} className="text-ivory hover:text-gold">
                      {b ? `$${b.symbol}` : shortAddress(o.basket)}
                    </Link>
                  </td>
                  <td className="tnum px-4 py-3 text-right text-ivory">{quantity(shares, 4)}</td>
                  <td className="tnum px-4 py-3 text-right text-ivory">{quantity(usdg, 2)} USDG</td>
                  <td className="tnum px-4 py-3 text-right text-ivory-dim">{money(usdg / shares)}</td>
                  <td className="px-4 py-3">
                    <span className={o.status === 1 && !expired ? "text-gain" : "text-ivory-faint"}>{label}</span>
                    {o.status === 1 && !expired && (
                      <span className="block text-xs text-ivory-faint">expires {timeAgo(o.expiry)}</span>
                    )}
                    {o.status === 2 && (
                      <span className="tnum block text-xs text-ivory-faint">by {shortAddress(o.filler, 6, 4)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {busy?.id === o.id ? (
                      <span className="text-xs text-ivory-dim">{busy.step}…</span>
                    ) : o.status === 1 ? (
                      <div className="flex justify-end gap-2">
                        {!expired && !mine && (
                          <button onClick={() => fill(o)} className="bg-gold px-3 py-1.5 text-xs font-medium text-ground-deep">
                            Fill with stocks
                          </button>
                        )}
                        {(mine || expired) && (
                          <button onClick={() => cancel(o)} className="border border-rule-bright px-3 py-1.5 text-xs text-ivory-dim hover:text-ivory">
                            Cancel
                          </button>
                        )}
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
