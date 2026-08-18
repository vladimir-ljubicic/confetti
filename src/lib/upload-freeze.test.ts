import { describe, expect, it } from "vitest";
import { parseUploadsFrozenField } from "./upload-freeze";

describe("parseUploadsFrozenField", () => {
  it("accepts a boolean uploadsFrozen field", () => {
    expect(parseUploadsFrozenField({ uploadsFrozen: true })).toBe(true);
    expect(parseUploadsFrozenField({ uploadsFrozen: false })).toBe(false);
  });

  it("rejects non-boolean values", () => {
    expect(parseUploadsFrozenField({ uploadsFrozen: "true" })).toBeNull();
    expect(parseUploadsFrozenField({ uploadsFrozen: 1 })).toBeNull();
    expect(parseUploadsFrozenField({})).toBeNull();
  });

  it("rejects non-object bodies", () => {
    expect(parseUploadsFrozenField(null)).toBeNull();
    expect(parseUploadsFrozenField("frozen")).toBeNull();
  });
});
