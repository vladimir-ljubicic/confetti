// The brand mark's five flecks and the sparks its entrance throws, mirrored by
// the `av-pop`, `burst` and `fleck-drift` keyframes in globals.css.

// Canonical geometry; every other size scales proportionally from it.
export const MARK_CANONICAL_SIZE = 14;

export type Fleck = {
  /** Tailwind background class. */
  color: string;
  /** Tailwind background class for the desaturated variant. */
  desaturated: string;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Shown only where the animations do not run; they override it. */
  rotation: number;
  /** How far into the entrance the fleck springs in, in seconds. */
  popDelay: number;
  /** The sway's period, in seconds. */
  driftDuration: number;
  /** When the sway takes over, in seconds. */
  driftDelay: number;
};

export const MARK_FLECKS: readonly Fleck[] = [
  {
    color: "bg-gold",
    desaturated: "bg-gold/45",
    left: 0,
    top: 2,
    width: 3,
    height: 5,
    rotation: -24,
    popDelay: 0.05,
    driftDuration: 4.4,
    driftDelay: 1.3,
  },
  {
    color: "bg-ink",
    desaturated: "bg-ink/35",
    left: 5,
    top: 0,
    width: 3,
    height: 4,
    rotation: 32,
    popDelay: 0.13,
    driftDuration: 4.8,
    driftDelay: 1.5,
  },
  {
    color: "bg-gold-light",
    desaturated: "bg-gold-light/50",
    left: 9,
    top: 3,
    width: 3,
    height: 5,
    rotation: -12,
    popDelay: 0.21,
    driftDuration: 5.2,
    driftDelay: 1.7,
  },
  {
    color: "bg-gold-small",
    desaturated: "bg-gold-small/40",
    left: 3,
    top: 8,
    width: 3,
    height: 4,
    rotation: 48,
    popDelay: 0.29,
    driftDuration: 5.6,
    driftDelay: 1.9,
  },
  {
    color: "bg-gold",
    desaturated: "bg-gold/35",
    left: 8,
    top: 9,
    width: 2,
    height: 3,
    rotation: -40,
    popDelay: 0.36,
    driftDuration: 5,
    driftDelay: 2.1,
  },
];

export type MarkSpark = {
  /** Tailwind background class. */
  color: string;
  width: number;
  height: number;
  /** Where the spark flies, relative to where it starts. */
  bx: number;
  by: number;
  /** How far into the entrance the spark leaves, in seconds. */
  delay: number;
};

export const MARK_SPARKS: readonly MarkSpark[] = [
  { color: "bg-gold-light", width: 3, height: 5, bx: -11, by: -9, delay: 0.18 },
  { color: "bg-gold", width: 3, height: 5, bx: 10, by: -10, delay: 0.22 },
  { color: "bg-gold-small", width: 2, height: 4, bx: -9, by: 9, delay: 0.26 },
  { color: "bg-ink", width: 2, height: 4, bx: 11, by: 5, delay: 0.3 },
  { color: "bg-gold", width: 2, height: 4, bx: 1, by: -12, delay: 0.34 },
];

// Every spark leaves from the middle of the mark.
export function markSparkOrigin(spark: MarkSpark): { left: number; top: number } {
  return {
    left: (MARK_CANONICAL_SIZE - spark.width) / 2,
    top: (MARK_CANONICAL_SIZE - spark.height) / 2,
  };
}
