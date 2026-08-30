import { describe, expect, it } from "vitest";
import {
  columnMetrics,
  columnWindow,
  tileHeightRatio,
} from "./grid-window";

describe("tileHeightRatio", () => {
  it("derives the ratio from the recorded pixel size", () => {
    expect(tileHeightRatio({ width: 800, height: 600 })).toBe(0.75);
    expect(tileHeightRatio({ width: 600, height: 800 })).toBeCloseTo(4 / 3);
  });

  it("falls back to the 3:4 portrait ratio when the size is unknown", () => {
    expect(tileHeightRatio({ width: null, height: null })).toBeCloseTo(4 / 3);
    expect(tileHeightRatio({ width: 800, height: null })).toBeCloseTo(4 / 3);
    expect(tileHeightRatio({ width: null, height: 600 })).toBeCloseTo(4 / 3);
  });
});

describe("columnMetrics", () => {
  it("stacks tiles with a gap between them", () => {
    // Ratios 1 and 2 at width 100 → heights 100 and 200.
    const metrics = columnMetrics([1, 2], 100, 8);
    expect(metrics.heights).toEqual([100, 200]);
    expect(metrics.offsets).toEqual([0, 108]);
    expect(metrics.total).toBe(308);
  });

  it("handles an empty column", () => {
    const metrics = columnMetrics([], 100, 8);
    expect(metrics.offsets).toEqual([]);
    expect(metrics.total).toBe(0);
  });
});

describe("columnWindow", () => {
  // Ten tiles of height 100 with an 8px gap: offsets 0, 108, 216, …
  const metrics = columnMetrics(Array(10).fill(1), 100, 8);

  it("mounts every tile the band touches", () => {
    const window = columnWindow(metrics, 108, 316);
    expect(window.start).toBe(1);
    expect(window.end).toBe(3);
  });

  it("mounts a tile the band only grazes", () => {
    // Band ends 1px into tile 3.
    const window = columnWindow(metrics, 50, 325);
    expect(window.start).toBe(0);
    expect(window.end).toBe(4);
  });

  it("sizes the spacers so the column keeps its full height", () => {
    const window = columnWindow(metrics, 108, 316);
    // Top spacer stands in for tile 0; the flex gap on each side of it
    // supplies the rest of the 108px offset.
    expect(window.topSpacer).toBe(100);
    // Tiles 3..9 remain below: total 1072 minus tile 3's offset 324, with the
    // gap before the spacer already supplied by flex.
    expect(window.bottomSpacer).toBe(metrics.total - 324);
    expect(window.topSpacer + 8 + 100 + 8 + 100 + 8 + window.bottomSpacer).toBe(
      metrics.total,
    );
  });

  it("omits spacers at the column edges", () => {
    const window = columnWindow(metrics, 0, metrics.total);
    expect(window).toEqual({
      start: 0,
      end: 10,
      topSpacer: 0,
      bottomSpacer: 0,
    });
  });

  it("collapses to one full-height spacer when the band is above the column", () => {
    const window = columnWindow(metrics, -500, -100);
    expect(window.start).toBe(0);
    expect(window.end).toBe(0);
    expect(window.topSpacer).toBe(0);
    expect(window.bottomSpacer).toBe(metrics.total);
  });

  it("collapses to one full-height spacer when the band is below the column", () => {
    const window = columnWindow(metrics, metrics.total + 100, metrics.total + 500);
    expect(window.start).toBe(10);
    expect(window.end).toBe(10);
    expect(window.topSpacer).toBe(metrics.total);
    expect(window.bottomSpacer).toBe(0);
  });

  it("handles an empty column", () => {
    const window = columnWindow(columnMetrics([], 100, 8), 0, 500);
    expect(window).toEqual({ start: 0, end: 0, topSpacer: 0, bottomSpacer: 0 });
  });
});
