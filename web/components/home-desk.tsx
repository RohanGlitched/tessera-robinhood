"use client";

import Link from "next/link";
import { who } from "./orders-table";
import { tokenAmount, useBaskets, useOrders } from "@/lib/baskets";
import { money, quantity, shortAddress, timeAgo } from "@/lib/format";
import { USDG } from "@/lib/tokens";

const STATUS = ["", "Open", "Filled", "Cancelled"];

/** The creation desk's last few orders, read from the contract, as they happened. */
export function DeskLive() {
  const orders = useOrders(null);
  const { baskets } = useBaskets();
  const bySymbol = new Map((baskets ?? []).map((b) => [b.address.toLowerCase(), b.symbol]));
  const now = Date.now() / 1000;
  const open = orders?.filter((o) => o.status === 1 && o.expiry > now).length ?? 0;
  const filled = orders?.filter((o) => o.status === 2).length ?? 0;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
      <div className="max-w-[42ch] self-center">
        <h2 className="display text-title text-ivory">Cash in, shares out, and the vault never sees the cash.</h2>
        <p className="mt-5 text-base leading-relaxed text-ivory-dim">
          Someone with only USDG escrows it on the creation desk. Anyone holding the stocks delivers them, the vault mints the shares straight to the
          buyer, and the filler collects the USDG and the premium. It is how an ETF&rsquo;s authorised participants work, open to everyone.
        </p>
        <p className="mt-4 flex items-center gap-2 text-sm text-ivory-faint">
          <span className="live-dot size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />A house participant watches the desk and fills orders that pay fair value, usually within a minute. It has no special rights on chain.
        </p>
        <p className="mt-6">
          <Link href="/desk" className="inline-flex items-center border border-rule-bright px-5 py-3 text-sm text-ivory hover:border-ivory-faint">
            {orders ? `See the desk · ${open} open, ${filled} filled` : "See the desk"}
          </Link>
        </p>
      </div>
      <div>
        {!orders ? (
          <div className="skeleton h-72 border border-rule" />
        ) : orders.length === 0 ? (
          <p className="border border-dashed border-rule-bright p-6 text-sm text-ivory-dim">No orders yet. Open any basket and use Buy with USDG.</p>
        ) : (
          <ol className="border border-rule">
            {orders.slice(0, 6).map((o) => {
              const shares = tokenAmount(o.shares);
              const usdg = tokenAmount(o.usdgAmount, USDG.decimals);
              const expired = o.status === 1 && now > o.expiry;
              const openNow = o.status === 1 && !expired;
              return (
                <li key={o.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 border-t border-rule px-4 py-3 first:border-t-0 sm:grid-cols-[72px_1fr_auto_auto]">
                  <span className="tnum text-xs text-ivory-faint">#{o.id}</span>
                  <span className="min-w-0">
                    <Link href={`/basket/${o.basket}`} className="text-ivory hover:text-gold">
                      ${bySymbol.get(o.basket.toLowerCase()) ?? shortAddress(o.basket)}
                    </Link>
                    <span className="tnum block text-xs text-ivory-faint">
                      {quantity(shares, 2)} shares for {quantity(usdg, 2)} USDG · {money(usdg / shares)} each
                    </span>
                  </span>
                  <span className="tnum hidden text-xs text-ivory-faint sm:block">by {shortAddress(o.buyer, 6, 4)}</span>
                  <span className={`text-right text-sm ${openNow ? "text-gain" : "text-ivory-dim"}`}>
                    {expired ? "Expired" : STATUS[o.status]}
                    {o.status === 2 && <span className="block text-xs text-ivory-faint">by {who(o.filler)}</span>}
                    {openNow && <span className="block text-xs text-ivory-faint">expires {timeAgo(o.expiry)}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
