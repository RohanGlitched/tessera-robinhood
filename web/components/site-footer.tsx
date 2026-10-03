import Link from "next/link";
import { Mark } from "./mark";
import { DEPLOYMENT, IS_DEPLOYED, explorerAddress } from "@/lib/chain";
import { shortAddress } from "@/lib/format";

export function SiteFooter() {
  return (
    <footer className="mt-14 border-t border-rule sm:mt-24">
      <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <Mark className="size-5 text-ivory-dim" />
            <p className="mt-4 text-sm leading-relaxed text-ivory-dim">
              Tessera composes Robinhood Stock Tokens into one token, backed share for share in a
              vault anyone can read. Quotes come from Robinhood&apos;s Stock Token API. Minting,
              redeeming and the creation desk settle on Robinhood Chain testnet.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <Link href="/compose" className="text-ivory-dim hover:text-ivory">
              Create a basket
            </Link>
            <Link href="/explore" className="text-ivory-dim hover:text-ivory">
              Explore baskets
            </Link>
            <Link href="/desk" className="text-ivory-dim hover:text-ivory">
              Creation desk
            </Link>
            <Link href="/method" className="text-ivory-dim hover:text-ivory">
              How it works
            </Link>
            {IS_DEPLOYED && (
              <>
                <a
                  href={explorerAddress(DEPLOYMENT.factory)}
                  target="_blank"
                  rel="noreferrer"
                  className="tnum text-ivory-faint hover:text-ivory"
                >
                  Factory {shortAddress(DEPLOYMENT.factory, 6, 4)}
                </a>
                <a
                  href={explorerAddress(DEPLOYMENT.desk)}
                  target="_blank"
                  rel="noreferrer"
                  className="tnum text-ivory-faint hover:text-ivory"
                >
                  Desk {shortAddress(DEPLOYMENT.desk, 6, 4)}
                </a>
              </>
            )}
          </div>
        </div>
        <p className="mt-10 border-t border-rule pt-6 text-xs leading-relaxed text-ivory-faint">
          Testnet software. Not investment advice and not an offer to sell anything. Robinhood Stock
          Tokens are issued by Robinhood; Tessera neither issues nor custodies them beyond the vault
          each basket holds.
        </p>
      </div>
    </footer>
  );
}
