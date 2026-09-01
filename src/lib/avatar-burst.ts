// The confetti sparks that explode out of the avatar when it arrives in the
// header, mirrored by the `burst-cycle` keyframes in globals.css.

export type BurstSpark = {
  /** Tailwind background class. */
  color: string;
  width: number;
  height: number;
  /** Where the spark flies, relative to where it starts, in px. */
  bx: number;
  by: number;
  /** How far into the cycle the spark leaves, in seconds. */
  delay: number;
};

// The avatar box the sparks start inside (`h-8 w-8`).
export const AVATAR_SIZE_PX = 32;

export const AVATAR_BURST_SPARKS: readonly BurstSpark[] = [
  { color: "bg-gold-light", width: 4, height: 7, bx: -30, by: -22, delay: 0.22 },
  { color: "bg-gold", width: 4, height: 7, bx: 26, by: -26, delay: 0.26 },
  { color: "bg-gold-small", width: 4, height: 6, bx: -24, by: 22, delay: 0.3 },
  { color: "bg-ink", width: 4, height: 6, bx: 30, by: 16, delay: 0.34 },
  { color: "bg-gold", width: 4, height: 7, bx: 2, by: -34, delay: 0.38 },
  { color: "bg-gold-light", width: 3, height: 5, bx: -34, by: -2, delay: 0.42 },
  { color: "bg-gold", width: 3, height: 5, bx: 16, by: 30, delay: 0.46 },
  { color: "bg-gold-small", width: 3, height: 5, bx: -12, by: 32, delay: 0.5 },
];

// Every spark leaves from the middle of the avatar, whatever its size.
export function sparkOrigin(spark: BurstSpark): { left: number; top: number } {
  return {
    left: (AVATAR_SIZE_PX - spark.width) / 2,
    top: (AVATAR_SIZE_PX - spark.height) / 2,
  };
}
