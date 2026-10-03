"use client";

import { OrdersTable } from "@/components/orders-table";
import { useWallet } from "@/components/wallet";
import { useBaskets, useOrders } from "@/lib/baskets";

export default function Desk() {
  const w = useWallet();
  const { baskets } = useBaskets(w.nonce);
  const orders = useOrders(null, w.nonce);
  const map = Object.fromEntries((baskets ?? []).map((b) => [b.address.toLowerCase(), b]));
  const open = orders?.filter((o) => o.status === 1 && o.expiry > Date.now() / 1000).length ?? 0;
  return (
    <section className="mx-auto max-w-[1400px] px-5 pt-14 sm:px-8">
      <h1 className="display text-title text-ivory">Creation desk</h1>
      <p className="mt-3 max-w-[64ch] text-ivory-dim">
        Buyers escrow USDG for basket shares. Anyone holding the stock tokens can fill an order:
        deliver the stocks, the vault mints the buyer&apos;s shares, and you collect the USDG. It is
        how an ETF&apos;s authorised participants work, open to everyone and settled on Robinhood
        Chain.
      </p>
      <p className="tnum mt-6 text-sm text-ivory-faint">{open} open {open === 1 ? "order" : "orders"}</p>
      <div className="mt-4">
        <OrdersTable orders={baskets ? orders : null} baskets={map} emptyText="No orders yet. Open any basket and use Buy with USDG." />
      </div>
    </section>
  );
}
