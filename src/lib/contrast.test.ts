import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, flatten, parseColor } from "./contrast";

// WCAG 2.1 AA for text below 24px (or 18.66px bold), which is every size in the
// type scale.
const AA_SMALL_TEXT = 4.5;

const paletteColors = readPalette();

// --color-ink-muted's alpha, as the utilities spell it.
const MUTED_FLOOR = Math.round(parseColor(paletteColors.get("ink-muted")!).alpha * 100);

// Everything a screen puts text on, down to the admin tab strip's sunken track.
const IVORY_SURFACES = [
  "paper",
  "card",
  "paper-alt",
  "sand",
  "gold-tint",
  "sand-deep",
] as const;

// Every colour the app is allowed to set on text.
const TEXT_COLORS = ["ink", "ink-muted", "gold-small", "gold-deep", "danger"] as const;

function readPalette(): Map<string, string> {
  const css = readFileSync(join(import.meta.dirname, "../app/globals.css"), "utf8");
  const palette = new Map<string, string>();
  for (const [, name, value] of css.matchAll(/--color-([a-z-]+):\s*([^;]+);/g)) {
    palette.set(name, value.trim());
  }
  return palette;
}

function ratio(textToken: string, surfaceToken: string): number {
  const text = parseColor(paletteColors.get(textToken)!);
  const surface = parseColor(paletteColors.get(surfaceToken)!);
  return contrastRatio(flatten(text, surface.rgb), surface.rgb);
}

function* components(dir: string): Generator<{ path: string; source: string }> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* components(path);
    } else if (entry.name.endsWith(".tsx")) {
      yield { path, source: readFileSync(path, "utf8") };
    }
  }
}

describe("the palette's text colours", () => {
  // Only the page and raised surfaces: gold-small drops under AA on the sunken
  // ones, which issue 63 is open on.
  it.each(TEXT_COLORS)("reads at AA on the page and on raised surfaces: %s", (text) => {
    expect(ratio(text, "paper")).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
    expect(ratio(text, "card")).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
  });

  // What buys muted text its alpha: one point lighter and the tab strip fails.
  it("sets muted text at the lightest ink that clears every surface", () => {
    const lighter = `rgba(43, 38, 32, ${(MUTED_FLOOR - 1) / 100})`;
    const sunken = parseColor(paletteColors.get("sand-deep")!);
    expect(
      contrastRatio(flatten(parseColor(lighter), sunken.rgb), sunken.rgb),
    ).toBeLessThan(AA_SMALL_TEXT);
  });

  it.each(IVORY_SURFACES)("holds muted text at AA on every ivory surface: %s", (surface) => {
    expect(ratio("ink-muted", surface)).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
  });

  // The reason gold-small exists beside gold.
  it("cannot set gold on text", () => {
    expect(ratio("gold", "paper")).toBeLessThan(AA_SMALL_TEXT);
  });
});

describe("the screens", () => {
  it("set no text in ink under the muted floor", () => {
    const offenders: string[] = [];
    for (const { path, source } of components(join(import.meta.dirname, "../app"))) {
      for (const [utility, alpha] of source.matchAll(/\btext-ink\/(\d+)\b/g)) {
        if (Number(alpha) <= MUTED_FLOOR) offenders.push(`${path}: ${utility}`);
      }
    }
    expect(offenders).toStrictEqual([]);
  });
});

describe("contrastRatio", () => {
  it("is 21 between black and white", () => {
    const black = parseColor("#000000");
    const white = parseColor("#ffffff");
    expect(contrastRatio(black.rgb, white.rgb)).toBeCloseTo(21, 5);
  });

  it("is 1 for a colour against itself", () => {
    const { rgb } = parseColor("#b08d3c");
    expect(contrastRatio(rgb, rgb)).toBeCloseTo(1, 5);
  });

  it("does not depend on which colour is given first", () => {
    const a = parseColor("#2b2620").rgb;
    const b = parseColor("#faf6ee").rgb;
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });
});

describe("flatten", () => {
  it("leaves an opaque colour alone", () => {
    const gold = parseColor("#b08d3c");
    expect(flatten(gold, parseColor("#faf6ee").rgb)).toStrictEqual(gold.rgb);
  });

  it("returns the surface when the colour is fully transparent", () => {
    const surface = parseColor("#faf6ee").rgb;
    expect(flatten(parseColor("rgba(43, 38, 32, 0)"), surface)).toStrictEqual(surface);
  });

  it("lands halfway between the two at half alpha", () => {
    expect(flatten(parseColor("rgba(0, 0, 0, 0.5)"), { r: 100, g: 200, b: 40 })).toStrictEqual({
      r: 50,
      g: 100,
      b: 20,
    });
  });
});
