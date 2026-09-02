import { describe, expect, it } from "vitest";
import { slideAt, slideOffset } from "./slide-track";

// A 3× phone whose viewport is 1178 device pixels wide.
const FRACTIONAL = 1178 / 3;

describe("slideAt", () => {
  it("stands on the slide it was scrolled to, at a fractional width", () => {
    for (const index of [0, 1, 40, 500, 3471, 9169]) {
      expect(slideAt(slideOffset(index, FRACTIONAL), FRACTIONAL, 9170)).toBe(
        index,
      );
    }
  });

  it("misses by whole slides when the width is rounded to a pixel", () => {
    const rounded = Math.round(FRACTIONAL);
    expect(slideAt(slideOffset(3471, rounded), FRACTIONAL, 9170)).toBe(3474);
  });

  it("clamps to the slides there are", () => {
    expect(slideAt(-100, FRACTIONAL, 9170)).toBe(0);
    expect(slideAt(slideOffset(20000, FRACTIONAL), FRACTIONAL, 9170)).toBe(9169);
  });

  it("stands at the start of a track with no width or no slides", () => {
    expect(slideAt(1000, 0, 9170)).toBe(0);
    expect(slideAt(1000, FRACTIONAL, 0)).toBe(0);
  });
});
