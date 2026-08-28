import { describe, expect, it } from "vitest";
import { resolveSortMode } from "./sort-mode";

describe("resolveSortMode", () => {
  it("honors an explicit latest choice", () => {
    expect(resolveSortMode("latest")).toBe("latest");
  });

  it("honors an explicit popular choice", () => {
    expect(resolveSortMode("popular")).toBe("popular");
  });

  it("defaults to latest when unset", () => {
    expect(resolveSortMode(undefined)).toBe("latest");
  });

  it("treats an unknown param as unset", () => {
    expect(resolveSortMode("newest")).toBe("latest");
  });

  it("falls back to latest for legacy params", () => {
    expect(resolveSortMode("live")).toBe("latest");
    expect(resolveSortMode("chrono")).toBe("latest");
  });
});
