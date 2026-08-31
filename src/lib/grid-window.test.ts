import { describe, expect, it } from "vitest";
import {
  columnMetrics,
  columnWindow,
  dealColumns,
  revealScrollTop,
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

describe("dealColumns", () => {
  it("deals each tile to the currently shorter column", () => {
    // Tile 0 (tie → left), tile 1 and 2 catch the right column up to 2,
    // tile 3 ties again → left.
    expect(dealColumns([2, 1, 1, 1])).toEqual([
      [0, 3],
      [1, 2],
    ]);
  });

  it("alternates when every tile has the same ratio", () => {
    expect(dealColumns([1, 1, 1, 1, 1])).toEqual([
      [0, 2, 4],
      [1, 3],
    ]);
  });

  it("handles an empty list", () => {
    expect(dealColumns([])).toEqual([[], []]);
  });

  it("keeps every index exactly once, in order, within its column", () => {
    const ratios = [1.5, 0.6, 1, 2, 0.75, 1.33, 1, 0.5];
    const [left, right] = dealColumns(ratios);
    expect([...left, ...right].sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(left).toEqual([...left].sort((a, b) => a - b));
    expect(right).toEqual([...right].sort((a, b) => a - b));
  });

  it("keeps rendered bottoms within one median tile across a large mixed list", () => {
    // Common photo aspect ratios, deterministically interleaved.
    const mix = [3 / 4, 4 / 3, 2 / 3, 3 / 2, 9 / 16, 16 / 9, 1];
    const ratios = Array.from(
      { length: 10_000 },
      (_, i) => mix[(i * 31) % mix.length],
    );
    const [left, right] = dealColumns(ratios);
    const columnWidth = 180;
    const gap = 8;
    const bottom = (indexes: number[]) =>
      indexes.reduce(
        (total, index) => total + ratios[index] * columnWidth + gap,
        0,
      );
    const median =
      [...ratios].sort((a, b) => a - b)[ratios.length >> 1] * columnWidth;
    expect(Math.abs(bottom(left) - bottom(right))).toBeLessThanOrEqual(median);
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

describe("revealScrollTop", () => {
  const viewport = 800;

  it("leaves the scroll alone for a tile comfortably on screen", () => {
    expect(revealScrollTop({ top: 1300, height: 200 }, 1000, viewport)).toBeNull();
  });

  it("centers a tile below the screen", () => {
    expect(revealScrollTop({ top: 3000, height: 200 }, 1000, viewport)).toBe(2700);
  });

  it("centers a tile above the screen", () => {
    expect(revealScrollTop({ top: 100, height: 200 }, 1000, viewport)).toBe(0);
    expect(revealScrollTop({ top: 2000, height: 200 }, 4000, viewport)).toBe(1700);
  });

  it("treats a tile hugging the screen's edge as off screen", () => {
    expect(revealScrollTop({ top: 1010, height: 200 }, 1000, viewport)).toBe(710);
    expect(revealScrollTop({ top: 1590, height: 200 }, 1000, viewport)).toBe(1290);
  });

  it("never scrolls above the page top", () => {
    expect(revealScrollTop({ top: 0, height: 100 }, 500, viewport)).toBe(0);
  });
});
