import { BRAND_PATHS } from "@/lib/brands";

/** A company's mark, single colour, sized by the caller. */
export function BrandMark({ symbol, className = "size-4" }: { symbol: string; className?: string }) {
  const d = BRAND_PATHS[symbol];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden focusable="false">
      <path d={d} />
    </svg>
  );
}
