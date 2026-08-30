import { describe, expect, it } from "vitest";
import { PHOTOS_BUCKET, RENDITIONS_BUCKET } from "./env";
import { renditionsBucket } from "./renditions";

describe("renditionsBucket", () => {
  it("puts a public live photo's renditions in the public bucket", () => {
    expect(renditionsBucket({ visibility: "public", deleted_at: null })).toBe(
      RENDITIONS_BUCKET,
    );
  });

  it("puts a private photo's renditions in the private bucket", () => {
    expect(renditionsBucket({ visibility: "private", deleted_at: null })).toBe(
      PHOTOS_BUCKET,
    );
  });

  it("puts a deleted photo's renditions in the private bucket even when public", () => {
    expect(
      renditionsBucket({ visibility: "public", deleted_at: "2026-08-29T00:00:00Z" }),
    ).toBe(PHOTOS_BUCKET);
  });
});
