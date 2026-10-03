import type { Metadata } from "next";
import { Fraunces, Archivo } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WalletProvider } from "@/components/wallet";
import { PriceProvider } from "@/components/prices";
import { SITE_URL } from "@/lib/chain";

/** Fraunces for anything that speaks, Archivo for anything that counts. */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tessera on Robinhood Chain — index baskets of Stock Tokens",
    template: "%s · Tessera",
  },
  description:
    "Compose Robinhood Stock Tokens into one fully backed basket token. Mint and redeem in kind, or buy with USDG through an open creation desk.",
  openGraph: {
    title: "Tessera on Robinhood Chain",
    description: "Robinhood Stock Tokens as one fully backed basket token, bought with USDG.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ground-deep">
        <WalletProvider>
          <PriceProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </PriceProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
