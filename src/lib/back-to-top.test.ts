import { describe, expect, it } from "vitest";
import { backToTopShown } from "./back-to-top";

describe("backToTopShown", () => {
  it("stays away until two screens down", () => {
    expect(backToTopShown(false, 0, 800)).toBe(false);
    expect(backToTopShown(false, 1400, 800)).toBe(false);
    expect(backToTopShown(false, 1600, 800)).toBe(true);
  });

  it("holds on the way back up until half a screen from the top", () => {
    expect(backToTopShown(true, 900, 800)).toBe(true);
    expect(backToTopShown(true, 400, 800)).toBe(false);
    expect(backToTopShown(true, 0, 800)).toBe(false);
  });

  it("stays away before the screen has a height", () => {
    expect(backToTopShown(false, 0, 0)).toBe(false);
    expect(backToTopShown(true, 0, 0)).toBe(false);
  });
});
