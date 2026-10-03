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
    <div className="overflow-x-auto">
      <svg viewBox="0 0 1200 470" className="min-w-[860px]" role="img" aria-label="Stocks go into the vault and a share token comes out; redeeming reverses it. A USDG buyer and a participant holding stocks meet at the creation desk, which mints shares straight to the buyer.">
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
  );
}
