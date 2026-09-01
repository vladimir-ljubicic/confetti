import { describe, expect, it } from "vitest";
import { AVATAR_BURST_SPARKS, AVATAR_SIZE_PX, sparkOrigin } from "./avatar-burst";

// The right padding of the header row the avatar sits in
// (`px-[18px]` in gallery-header.tsx).
const HEADER_GUTTER_PX = 18;

// Past this the eight stop reading as one explosion and start to trickle.
const SPREAD_SECONDS = 0.3;

describe("AVATAR_BURST_SPARKS", () => {
  it("is the eight sparks the arrival explodes with", () => {
    expect(AVATAR_BURST_SPARKS).toHaveLength(8);
  });

  it("sends them all out together", () => {
    const delays = AVATAR_BURST_SPARKS.map((spark) => spark.delay);
    expect(delays).toStrictEqual([...delays].sort((a, b) => a - b));
    expect(Math.max(...delays) - Math.min(...delays)).toBeLessThanOrEqual(SPREAD_SECONDS);
  });

  it("flies no further right than the header's gutter", () => {
    for (const spark of AVATAR_BURST_SPARKS) {
      const right = sparkOrigin(spark).left + spark.bx + spark.width;
      expect(right - AVATAR_SIZE_PX).toBeLessThanOrEqual(HEADER_GUTTER_PX);
    }
  });
});
