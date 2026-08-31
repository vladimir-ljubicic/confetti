import { describe, expect, it } from "vitest";
import {
  formatSize,
  PACKING_ETA_WARMUP_MS,
  packingEtaMs,
  parseExportStatus,
} from "./export";

describe("formatSize", () => {
  it("formats gigabytes with one decimal", () => {
    expect(formatSize(4_200_000_000)).toBe("4.2 GB");
    expect(formatSize(12_400_000_000)).toBe("12 GB");
  });

  it("formats megabytes below a gigabyte", () => {
    expect(formatSize(850_000_000)).toBe("850 MB");
    expect(formatSize(120_000)).toBe("1 MB");
  });
});

describe("parseExportStatus", () => {
  it("accepts a full status", () => {
    expect(
      parseExportStatus({ state: "packing", done: 3, total: 10, sizeBytes: 42 }),
    ).toEqual({ state: "packing", done: 3, total: 10, sizeBytes: 42 });
  });

  it("rejects unknown states", () => {
    expect(parseExportStatus({ state: "nope" })).toBeNull();
    expect(parseExportStatus(null)).toBeNull();
  });
});

describe("parseExportStatus (cancelled)", () => {
  it("accepts a cancelled job", () => {
    expect(parseExportStatus({ state: "cancelled", done: 0, total: 0 })).toEqual({
      state: "cancelled",
      done: 0,
      total: 0,
      sizeBytes: null,
    });
  });
});

describe("packingEtaMs", () => {
  const at = 1_000_000;

  it("shows nothing until the warmup has elapsed", () => {
    expect(
      packingEtaMs({ done: 0, at }, { done: 20, at: at + PACKING_ETA_WARMUP_MS - 1 }, 184),
    ).toBeNull();
  });

  it("shows nothing when no photo has been packed since the first sample", () => {
    expect(
      packingEtaMs({ done: 118, at }, { done: 118, at: at + PACKING_ETA_WARMUP_MS }, 184),
    ).toBeNull();
  });

  it("extrapolates the observed rate over the photos still to pack", () => {
    // 20 photos in 10 s leaves 164 photos → 82 s.
    expect(
      packingEtaMs({ done: 0, at }, { done: 20, at: at + 10_000 }, 184),
    ).toBe(82_000);
  });

  it("measures from the first sample, not from zero", () => {
    // Joined at 100 of 184; 42 more in 10 s leaves 42 → 10 s.
    expect(
      packingEtaMs({ done: 100, at }, { done: 142, at: at + 10_000 }, 184),
    ).toBe(10_000);
  });
});
