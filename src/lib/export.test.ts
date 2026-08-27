import { describe, expect, it } from "vitest";
import { formatSize, parseExportStatus } from "./export";

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
