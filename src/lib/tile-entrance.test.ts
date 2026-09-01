import { describe, expect, it } from "vitest";
import { NO_SHOWN_TILES, tileEnterDelay, withShownTiles } from "./tile-entrance";

describe("withShownTiles", () => {
  it("takes in the photos of a first grid", () => {
    expect([...withShownTiles(NO_SHOWN_TILES, ["a", "b"])]).toEqual(["a", "b"]);
  });

  it("comes back unchanged when every photo has been shown", () => {
    const shown = withShownTiles(NO_SHOWN_TILES, ["a", "b"]);
    expect(withShownTiles(shown, ["b", "a"])).toBe(shown);
    expect(withShownTiles(shown, [])).toBe(shown);
  });

  it("adds the photos that have arrived", () => {
    const shown = withShownTiles(NO_SHOWN_TILES, ["a"]);
    expect([...withShownTiles(shown, ["a", "b"])]).toEqual(["a", "b"]);
  });

  it("keeps photos the grid no longer holds, so a return is not an arrival", () => {
    const shown = withShownTiles(NO_SHOWN_TILES, ["a", "b"]);
    const narrowed = withShownTiles(shown, ["a"]);
    expect(narrowed.has("b")).toBe(true);
  });
});

describe("tileEnterDelay", () => {
  it("staggers a page's tiles by 40ms each", () => {
    expect(tileEnterDelay(0)).toBe("0ms");
    expect(tileEnterDelay(1)).toBe("40ms");
    expect(tileEnterDelay(8)).toBe("320ms");
  });

  it("stops the stagger growing deep into a page", () => {
    expect(tileEnterDelay(9)).toBe("320ms");
    expect(tileEnterDelay(60)).toBe("320ms");
  });

  it("leaves a tile that arrived with no page undelayed", () => {
    expect(tileEnterDelay(undefined)).toBeUndefined();
  });
});
