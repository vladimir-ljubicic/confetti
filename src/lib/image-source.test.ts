import { describe, expect, it } from "vitest";
import { imageSource, TRANSFORM_SOURCE_LIMIT_BYTES } from "./image-source";

describe("imageSource", () => {
  it("picks a transform when transforms are enabled", () => {
    expect(
      imageSource({ sizeBytes: 5_000_000, transformsEnabled: true, hasThumbnail: false }),
    ).toEqual({ kind: "transform" });
  });

  it("picks the original when transforms are disabled", () => {
    expect(
      imageSource({ sizeBytes: 5_000_000, transformsEnabled: false, hasThumbnail: false }),
    ).toEqual({ kind: "original" });
  });

  it("picks the original when an oversize file has no thumbnail", () => {
    expect(
      imageSource({
        sizeBytes: TRANSFORM_SOURCE_LIMIT_BYTES + 1,
        transformsEnabled: true,
        hasThumbnail: false,
      }),
    ).toEqual({ kind: "original" });
  });

  it("still transforms a file exactly at the limit", () => {
    expect(
      imageSource({
        sizeBytes: TRANSFORM_SOURCE_LIMIT_BYTES,
        transformsEnabled: true,
        hasThumbnail: true,
      }),
    ).toEqual({ kind: "transform" });
  });

  it("picks the thumbnail for an oversize file that has one", () => {
    expect(
      imageSource({
        sizeBytes: TRANSFORM_SOURCE_LIMIT_BYTES + 1,
        transformsEnabled: true,
        hasThumbnail: true,
      }),
    ).toEqual({ kind: "thumbnail" });
  });

  it("picks the thumbnail for an oversize file even when transforms are disabled", () => {
    expect(
      imageSource({
        sizeBytes: TRANSFORM_SOURCE_LIMIT_BYTES + 1,
        transformsEnabled: false,
        hasThumbnail: true,
      }),
    ).toEqual({ kind: "thumbnail" });
  });

  it("ignores the thumbnail for files within the limit", () => {
    expect(
      imageSource({ sizeBytes: 5_000_000, transformsEnabled: false, hasThumbnail: true }),
    ).toEqual({ kind: "original" });
  });
});
