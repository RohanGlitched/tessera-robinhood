import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 pt-20 sm:px-8">
      <p className="text-sm text-ivory-faint">404</p>
      <h1 className="display mt-2 text-title text-ivory">There is no page here.</h1>
      <p className="mt-3 max-w-[52ch] text-ivory-dim">
        Baskets live at /basket/0x… and everything else is one click away.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/explore" className="bg-gold px-5 py-3 text-sm font-medium text-ground-deep">
          Explore baskets
        </Link>
        <Link href="/" className="border border-rule-bright px-5 py-3 text-sm text-ivory">
          Home
        </Link>
      </div>
    </section>
  );
}
