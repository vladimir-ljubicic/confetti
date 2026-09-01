import { describe, expect, it } from "vitest";
import {
  MARK_CANONICAL_SIZE,
  MARK_FLECKS,
  MARK_SPARKS,
  markSparkOrigin,
} from "./brand-mark";

// The entrance timings in globals.css that these tables are cut to fit.
const POP_SECONDS = 0.5;
const BURST_SECONDS = 0.85;

// Past this the five stop reading as one explosion and start to trickle.
const SPREAD_SECONDS = 0.2;

describe("MARK_FLECKS", () => {
  it("is the five flecks of the mark", () => {
    expect(MARK_FLECKS).toHaveLength(5);
  });

  it("springs them in one after another", () => {
    const delays = MARK_FLECKS.map((fleck) => fleck.popDelay);
    expect(delays).toStrictEqual([...delays].sort((a, b) => a - b));
  });

  it("draws every fleck inside the mark", () => {
    for (const fleck of MARK_FLECKS) {
      expect(fleck.left + fleck.width).toBeLessThanOrEqual(MARK_CANONICAL_SIZE);
      expect(fleck.top + fleck.height).toBeLessThanOrEqual(MARK_CANONICAL_SIZE);
    }
  });

  it("starts the sway only once the entrance is over", () => {
    const entranceEnds = Math.max(
      ...MARK_FLECKS.map((fleck) => fleck.popDelay + POP_SECONDS),
      ...MARK_SPARKS.map((spark) => spark.delay + BURST_SECONDS),
    );
    for (const fleck of MARK_FLECKS) {
      expect(fleck.driftDelay).toBeGreaterThanOrEqual(entranceEnds);
    }
  });

  it("gives each fleck its own sway, so they never beat together", () => {
    const periods = MARK_FLECKS.map((fleck) => fleck.driftDuration);
    expect(new Set(periods).size).toBe(periods.length);
  });
});

describe("MARK_SPARKS", () => {
  it("is the five sparks the entrance throws", () => {
    expect(MARK_SPARKS).toHaveLength(5);
  });

  it("sends them all out together", () => {
    const delays = MARK_SPARKS.map((spark) => spark.delay);
    expect(delays).toStrictEqual([...delays].sort((a, b) => a - b));
    expect(Math.max(...delays) - Math.min(...delays)).toBeLessThanOrEqual(SPREAD_SECONDS);
  });

  it("flies every spark clear of the mark", () => {
    for (const spark of MARK_SPARKS) {
      const origin = markSparkOrigin(spark);
      const left = origin.left + spark.bx;
      const top = origin.top + spark.by;
      const clear =
        left + spark.width <= 0 ||
        left >= MARK_CANONICAL_SIZE ||
        top + spark.height <= 0 ||
        top >= MARK_CANONICAL_SIZE;
      expect(clear).toBe(true);
    }
  });
});
