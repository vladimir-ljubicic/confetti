import { describe, expect, it } from "vitest";
import { resolveSortMode } from "./sort-mode";

describe("resolveSortMode", () => {
  it("honors an explicit live choice", () => {
    expect(resolveSortMode("live", new Date("2027-01-01T00:00:00Z"))).toBe("live");
  });

  it("honors an explicit chrono choice", () => {
    expect(resolveSortMode("chrono", new Date("2026-01-01T00:00:00Z"))).toBe("chrono");
  });

  it("defaults to live before the wedding day ends", () => {
    expect(resolveSortMode(undefined, new Date("2026-09-20T21:59:59Z"))).toBe("live");
  });

  it("defaults to chrono once the wedding day is over (midnight in Belgrade)", () => {
    expect(resolveSortMode(undefined, new Date("2026-09-20T22:00:00Z"))).toBe("chrono");
  });

  it("treats an unknown param as unset", () => {
    expect(resolveSortMode("newest", new Date("2026-01-01T00:00:00Z"))).toBe("live");
  });
});
