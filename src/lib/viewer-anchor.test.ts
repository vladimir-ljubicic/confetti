import { describe, expect, it } from "vitest";
import { anchoredIndex } from "./viewer-anchor";

const photos = (...ids: string[]) => ids.map((id) => ({ id }));

describe("anchoredIndex", () => {
  it("keeps the index when nothing moved", () => {
    expect(anchoredIndex(photos("a", "b", "c"), 1, photos("a", "b", "c"))).toBe(
      1,
    );
  });

  it("follows the photo when new ones land in front of it", () => {
    expect(anchoredIndex(photos("a", "b"), 1, photos("x", "a", "b"))).toBe(2);
  });

  it("follows the photo when one in front of it is gone", () => {
    expect(anchoredIndex(photos("a", "b", "c"), 2, photos("a", "c"))).toBe(1);
  });

  it("stays in place when the photo itself is gone", () => {
    expect(anchoredIndex(photos("a", "b", "c"), 1, photos("a", "c"))).toBe(1);
  });

  it("clamps a place past the end of the new list", () => {
    expect(anchoredIndex(photos("a", "b", "c"), 2, photos("a"))).toBe(0);
  });

  it("never goes below the first slide", () => {
    expect(anchoredIndex(photos("a"), 0, photos())).toBe(0);
    expect(anchoredIndex(photos(), 0, photos("a"))).toBe(0);
  });
});
