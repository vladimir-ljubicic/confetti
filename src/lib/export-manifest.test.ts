import { describe, expect, it } from "vitest";
import {
  buildManifest,
  folderName,
  timestampPrefix,
  UNKNOWN_UPLOADER_FOLDER,
  type ExportPhoto,
} from "./export-manifest";

function photo(overrides: Partial<ExportPhoto>): ExportPhoto {
  return {
    storagePath: "u1/p1.jpg",
    originalFilename: "IMG_0001.jpg",
    sizeBytes: 100,
    takenAt: "2026-09-20T16:32:45Z",
    displayName: "Ана Анић",
    ...overrides,
  };
}

describe("folderName", () => {
  it("keeps display names and strips path characters", () => {
    expect(folderName("Ана Анић")).toBe("Ана Анић");
    expect(folderName("a/b\\c: *?\"<>|d")).toBe("a b c d");
  });

  it("falls back for missing names", () => {
    expect(folderName(null)).toBe(UNKNOWN_UPLOADER_FOLDER);
    expect(folderName("   ")).toBe(UNKNOWN_UPLOADER_FOLDER);
  });
});

describe("timestampPrefix", () => {
  it("renders Belgrade wall time (CEST in September)", () => {
    expect(timestampPrefix("2026-09-20T16:32:45Z")).toBe("20260920_183245");
  });

  it("renders CET in winter", () => {
    expect(timestampPrefix("2026-12-20T23:30:00Z")).toBe("20261221_003000");
  });
});

describe("buildManifest", () => {
  it("prefixes filenames with the taken timestamp inside the uploader folder", () => {
    const [entry] = buildManifest([photo({})]);
    expect(entry.name).toBe("Ана Анић/20260920_183245_IMG_0001.jpg");
    expect(entry.path).toBe("u1/p1.jpg");
    expect(entry.size).toBe(100);
  });

  it("groups by uploader, ordered by taken time inside a folder", () => {
    const names = buildManifest([
      photo({ storagePath: "b/1.jpg", displayName: "Боба", takenAt: "2026-09-20T10:00:00Z" }),
      photo({ storagePath: "a/2.jpg", displayName: "Ана", takenAt: "2026-09-20T12:00:00Z" }),
      photo({ storagePath: "a/1.jpg", displayName: "Ана", takenAt: "2026-09-20T09:00:00Z" }),
    ]).map((entry) => entry.name.split("/")[0]);
    expect(names).toEqual(["Ана", "Ана", "Боба"]);
  });

  it("dedupes identical names", () => {
    const entries = buildManifest([
      photo({ storagePath: "u1/p1.jpg" }),
      photo({ storagePath: "u1/p2.jpg" }),
    ]);
    expect(entries[0].name).toBe("Ана Анић/20260920_183245_IMG_0001.jpg");
    expect(entries[1].name).toBe("Ана Анић/20260920_183245_IMG_0001 (2).jpg");
  });
});
