import { describe, expect, it } from "vitest";
import { imageSource, TRANSFORM_SOURCE_LIMIT_BYTES } from "./image-source";

describe("imageSource", () => {
  it("picks a transform when transforms are enabled", () => {
    expect(
      imageSource({ sizeBytes: 5_000_000, transformsEnabled: true }),
    ).toEqual({ kind: "transform" });
  });

  it("picks the original when transforms are disabled", () => {
    expect(
      imageSource({ sizeBytes: 5_000_000, transformsEnabled: false }),
    ).toEqual({ kind: "original" });
  });

  it("picks the original when the file exceeds the transform source limit", () => {
    expect(
      imageSource({
        sizeBytes: TRANSFORM_SOURCE_LIMIT_BYTES + 1,
        transformsEnabled: true,
      }),
    ).toEqual({ kind: "original" });
  });

  it("still transforms a file exactly at the limit", () => {
    expect(
      imageSource({
        sizeBytes: TRANSFORM_SOURCE_LIMIT_BYTES,
        transformsEnabled: true,
      }),
    ).toEqual({ kind: "transform" });
  });
});
