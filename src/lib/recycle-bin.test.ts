import { describe, expect, it } from "vitest";
import { purgeCutoff, purgeStoragePaths } from "./recycle-bin";

describe("purgeCutoff", () => {
  it("is 30 days before the given moment", () => {
    expect(purgeCutoff(new Date("2026-09-30T12:00:00.000Z"))).toBe(
      "2026-08-31T12:00:00.000Z",
    );
  });
});

describe("purgeStoragePaths", () => {
  it("includes originals and thumbnails when present", () => {
    expect(
      purgeStoragePaths([
        { storage_path: "u1/p1.jpg", thumbnail_path: null },
        { storage_path: "u1/p2.heic", thumbnail_path: "u1/p2.thumb.jpg" },
      ]),
    ).toEqual(["u1/p1.jpg", "u1/p2.heic", "u1/p2.thumb.jpg"]);
  });

  it("is empty for no photos", () => {
    expect(purgeStoragePaths([])).toEqual([]);
  });
});
