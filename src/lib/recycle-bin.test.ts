import { describe, expect, it } from "vitest";
import { purgeCutoff, purgeRenditionPaths, purgeStoragePaths } from "./recycle-bin";

describe("purgeCutoff", () => {
  it("is 30 days before the given moment", () => {
    expect(purgeCutoff(new Date("2026-09-30T12:00:00.000Z"))).toBe(
      "2026-08-31T12:00:00.000Z",
    );
  });
});

describe("purgeStoragePaths", () => {
  it("includes each photo's original and every rendition path", () => {
    expect(
      purgeStoragePaths([
        { id: "p1", storage_path: "u1/p1.jpg" },
        { id: "p2", storage_path: "u1/p2.heic" },
      ]),
    ).toEqual([
      "u1/p1.jpg",
      "p1/thumb.jpg",
      "p1/viewer.jpg",
      "u1/p2.heic",
      "p2/thumb.jpg",
      "p2/viewer.jpg",
    ]);
  });

  it("is empty for no photos", () => {
    expect(purgeStoragePaths([])).toEqual([]);
  });
});

describe("purgeRenditionPaths", () => {
  it("lists every rendition path of every photo", () => {
    expect(purgeRenditionPaths([{ id: "p1" }, { id: "p2" }])).toEqual([
      "p1/thumb.jpg",
      "p1/viewer.jpg",
      "p2/thumb.jpg",
      "p2/viewer.jpg",
    ]);
  });
});
