import { COMPONENT_SLOTS } from "@/lib/palette";

/**
 * How a share is made, drawn rather than described. Top lane: in-kind mint and
 * redemption. Bottom lane: a USDG buyer and a participant meeting at the desk.
 */
export function FlowDiagram() {
  const ivory = "#ede6d6";
  const dim = "#b3ab9c";
  const faint = "#888c9c";
  const rule = "#35446a";
  const gold = "#b18827";
  const stock = [
    { t: "TSLA", x: 0, y: 0, w: 92, h: 70 },
    { t: "AMZN", x: 96, y: 0, w: 72, h: 70 },
    { t: "AMD", x: 0, y: 74, w: 60, h: 66 },
    { t: "PLTR", x: 64, y: 74, w: 54, h: 66 },
    { t: "NFLX", x: 122, y: 74, w: 46, h: 66 },
  ];
  const label = { fontFamily: "var(--font-archivo), system-ui, sans-serif" } as const;
  const title = { fontFamily: "var(--font-fraunces), Georgia, serif" } as const;

  return (
    <>
    <MobileFlow />
    <div className="hidden sm:block">
      <svg viewBox="0 0 1200 470" className="w-full" role="img" aria-label="Stocks go into the vault and a share token comes out; redeeming reverses it. A USDG buyer and a participant holding stocks meet at the creation desk, which mints shares straight to the buyer.">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={dim} />
          </marker>
        </defs>

        {/* Stocks */}
        <g transform="translate(40 90)">
          {stock.map((s, i) => (
            <g key={s.t}>
              <rect x={s.x} y={s.y} width={s.w} height={s.h} fill={COMPONENT_SLOTS[i]} />
              <text x={s.x + 8} y={s.y + 18} fontSize="12" fontWeight="600" fill="#0a1224" style={label}>
                {s.t}
              </text>
            </g>
          ))}
          <text x="0" y="172" fontSize="20" fill={ivory} style={title}>Stock tokens</text>
          <text x="0" y="194" fontSize="13" fill={faint} style={label}>in any wallet</text>
        </g>

        {/* Vault */}
        <g transform="translate(470 70)">
          <rect x="0" y="0" width="260" height="180" fill="none" stroke={rule} strokeWidth="1.5" />
          <g transform="translate(20 20)">
            {stock.map((s, i) => (
              <rect key={s.t} x={s.x * 1.3} y={s.y * 0.97} width={s.w * 1.3} height={s.h * 0.97} fill={COMPONENT_SLOTS[i]} opacity="0.9" />
            ))}
          </g>
          <text x="0" y="-30" fontSize="20" fill={ivory} style={title}>The basket vault</text>
          <text x="0" y="-10" fontSize="13" fill={faint} style={label}>immutable recipe, no owner</text>
        </g>

        {/* Share token */}
        <g transform="translate(960 100)">
          <rect x="0" y="0" width="120" height="120" fill={gold} />
          <rect x="0" y="0" width="120" height="1.5" fill="#fff" opacity=".35" />
          <text x="60" y="68" fontSize="22" textAnchor="middle" fill="#0a1224" style={title}>$HOOD5</text>
          <text x="0" y="172" fontSize="20" fill={ivory} style={title}>One share token</text>
          <text x="0" y="194" fontSize="13" fill={faint} style={label}>an ERC-20 you can hold or send</text>
        </g>

        {/* Mint and redeem */}
        <path className="draw" style={{ ["--len" as string]: 240 }} d="M232 142 H462" stroke={dim} strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
        <text x="252" y="130" fontSize="13" fill={dim} style={label}>mint: deposit the recipe</text>
        <path className="draw" style={{ ["--len" as string]: 240, ["--delay" as string]: "150ms" }} d="M462 192 H232" stroke={gold} strokeWidth="1.5" strokeDasharray="5 5" fill="none" markerEnd="url(#arrow)" />
        <text x="252" y="214" fontSize="13" fill={gold} style={label}>redeem: stocks back, pro rata</text>
        <path className="draw" style={{ ["--len" as string]: 230, ["--delay" as string]: "300ms" }} d="M738 142 H952" stroke={dim} strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
        <text x="758" y="130" fontSize="13" fill={dim} style={label}>share minted to you</text>
        <path className="draw" style={{ ["--len" as string]: 230, ["--delay" as string]: "450ms" }} d="M952 192 H738" stroke={gold} strokeWidth="1.5" strokeDasharray="5 5" fill="none" markerEnd="url(#arrow)" />
        <text x="758" y="214" fontSize="13" fill={gold} style={label}>burn it any time</text>

        {/* Desk lane */}
        <g transform="translate(40 340)">
          <rect x="0" y="0" width="230" height="76" fill="#16233d" stroke={rule} />
          <text x="18" y="32" fontSize="18" fill={ivory} style={title}>Buyer with USDG</text>
          <text x="18" y="54" fontSize="13" fill={faint} style={label}>escrows cash for N shares</text>
        </g>
        <g transform="translate(470 340)">
          <rect x="0" y="0" width="260" height="76" fill="#16233d" stroke={gold} />
          <text x="18" y="32" fontSize="18" fill={ivory} style={title}>Creation desk</text>
          <text x="18" y="54" fontSize="13" fill={faint} style={label}>swaps USDG for delivered stocks</text>
        </g>
        <g transform="translate(930 340)">
          <rect x="0" y="0" width="230" height="76" fill="#16233d" stroke={rule} />
          <text x="18" y="32" fontSize="18" fill={ivory} style={title}>Anyone with stocks</text>
          <text x="18" y="54" fontSize="13" fill={faint} style={label}>fills the order, earns the premium</text>
        </g>
        <path className="draw" style={{ ["--len" as string]: 200, ["--delay" as string]: "900ms" }} d="M272 378 H462" stroke={dim} strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
        <text x="300" y="368" fontSize="13" fill={dim} style={label}>USDG in escrow</text>
        <path className="draw" style={{ ["--len" as string]: 200, ["--delay" as string]: "1000ms" }} d="M928 378 H738" stroke={dim} strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
        <text x="770" y="368" fontSize="13" fill={dim} style={label}>stock tokens</text>
        <path className="draw" style={{ ["--len" as string]: 90, ["--delay" as string]: "1200ms" }} d="M600 336 V 258" stroke={gold} strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
        <text x="612" y="304" fontSize="13" fill={gold} style={label}>mints straight to the buyer</text>
      </svg>
    </div>
    </>
  );
}

function Arrow({ text, gold = false }: { text: string; gold?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3 pl-6">
      <svg width="12" height="34" viewBox="0 0 12 34" aria-hidden>
        <path d="M6 0V30" stroke={gold ? "#b18827" : "#b3ab9c"} strokeWidth="1.5" strokeDasharray={gold ? "4 4" : undefined} />
        <path d="M1 26L6 33L11 26" fill="none" stroke={gold ? "#b18827" : "#b3ab9c"} strokeWidth="1.5" />
      </svg>
      <span className={`text-sm ${gold ? "text-gold" : "text-ivory-dim"}`}>{text}</span>
    </div>
  );
}

/** The same story, stacked, for a phone. */
function MobileFlow() {
  return (
    <div className="sm:hidden">
      <div className="flex items-center gap-4">
        <div className="grid shrink-0 grid-cols-5 gap-0.5">
          {COMPONENT_SLOTS.slice(0, 5).map((c) => (
            <span key={c} className="h-10 w-5" style={{ background: c }} />
          ))}
        </div>
        <div>
          <p className="display text-lg text-ivory">Stock tokens</p>
          <p className="text-xs text-ivory-faint">in any wallet</p>
        </div>
      </div>
      <Arrow text="mint: deposit the recipe" />
      <div className="flex items-center gap-4">
        <div className="grid size-12 shrink-0 grid-cols-2 gap-0.5 border border-rule-bright p-1">
          {COMPONENT_SLOTS.slice(0, 4).map((c) => (
            <span key={c} style={{ background: c }} />
          ))}
        </div>
        <div>
          <p className="display text-lg text-ivory">The basket vault</p>
          <p className="text-xs text-ivory-faint">immutable recipe, no owner</p>
        </div>
      </div>
      <Arrow text="share minted to you" />
      <div className="flex items-center gap-4">
        <span className="display flex h-12 w-14 shrink-0 items-center justify-center bg-gold text-[10px] text-ground-deep">$HOOD5</span>
        <div>
          <p className="display text-lg text-ivory">One share token</p>
          <p className="text-xs text-ivory-faint">burn it any time to take the stocks back, pro rata</p>
        </div>
      </div>
      <div className="mt-8 border-t border-rule pt-6">
        <p className="text-xs text-ivory-faint">Or start with cash</p>
        <div className="mt-3 border border-rule-bright bg-ground-raised p-4">
          <p className="display text-lg text-ivory">Buyer with USDG</p>
          <p className="text-xs text-ivory-faint">escrows cash for N shares</p>
        </div>
        <Arrow text="USDG in escrow" />
        <div className="border border-gold bg-ground-raised p-4">
          <p className="display text-lg text-ivory">Creation desk</p>
          <p className="text-xs text-ivory-faint">anyone holding the stocks fills the order and earns the premium</p>
        </div>
        <Arrow text="the vault mints straight to the buyer" gold />
      </div>
    </div>
  );
}
