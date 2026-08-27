import { describe, expect, it } from "vitest";
import { estimateRemainingMs, formatEta } from "./upload-eta";

const labels = { minutes: "око {min} мин", underMinute: "мање од минут" };

describe("estimateRemainingMs", () => {
  it("returns null without any measured throughput", () => {
    expect(estimateRemainingMs(0, 1000, 5000)).toBeNull();
    expect(estimateRemainingMs(100, 1000, 0)).toBeNull();
  });

  it("extrapolates the measured rate over the remaining bytes", () => {
    expect(estimateRemainingMs(250, 1000, 10_000)).toBe(30_000);
  });

  it("clamps to zero when uploads outpaced the total", () => {
    expect(estimateRemainingMs(1000, 1000, 10_000)).toBe(0);
    expect(estimateRemainingMs(1200, 1000, 10_000)).toBe(0);
  });
});

describe("formatEta", () => {
  it("shows minutes, rounded up", () => {
    expect(formatEta(3 * 60_000, labels)).toBe("око 3 мин");
    expect(formatEta(61_000, labels)).toBe("око 2 мин");
  });

  it("shows the under-a-minute label at one minute or less", () => {
    expect(formatEta(60_000, labels)).toBe("мање од минут");
    expect(formatEta(500, labels)).toBe("мање од минут");
  });
});
