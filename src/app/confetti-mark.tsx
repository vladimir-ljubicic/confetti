type Variant = "static" | "animated" | "desaturated";

// Canonical geometry at 14px; other sizes scale proportionally.
const CANONICAL_SIZE = 14;

const FLECKS = [
  { left: 0, top: 2, width: 3, height: 5, rotation: -24, color: "bg-gold", desaturated: "bg-gold/45" },
  { left: 5, top: 0, width: 3, height: 4, rotation: 32, color: "bg-ink", desaturated: "bg-ink/35" },
  { left: 9, top: 3, width: 3, height: 5, rotation: -12, color: "bg-gold-light", desaturated: "bg-gold-light/50" },
  { left: 3, top: 8, width: 3, height: 4, rotation: 48, color: "bg-gold-small", desaturated: "bg-gold-small/40" },
  { left: 8, top: 9, width: 2, height: 3, rotation: -40, color: "bg-gold", desaturated: "bg-gold/35" },
];

export function ConfettiMark({
  size = 14,
  variant = "static",
}: {
  size?: number;
  variant?: Variant;
}) {
  const px = (value: number) => Math.round((value * size) / CANONICAL_SIZE);

  return (
    <span
      aria-hidden
      className={`relative block ${variant === "animated" ? "confetti-mark-animated" : ""}`}
      style={{ width: size, height: size }}
    >
      {FLECKS.map((fleck, i) => (
        <span
          key={i}
          className={`absolute rounded-[1px] ${variant === "desaturated" ? fleck.desaturated : fleck.color}`}
          style={{
            left: px(fleck.left),
            top: px(fleck.top),
            width: px(fleck.width),
            height: px(fleck.height),
            // Overridden while the animated variant's animations run; under
            // prefers-reduced-motion those are disabled and this settled
            // rotation shows instead.
            transform: `rotate(${fleck.rotation}deg)`,
          }}
        />
      ))}
    </span>
  );
}
