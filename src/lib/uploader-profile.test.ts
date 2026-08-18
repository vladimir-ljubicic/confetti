import { describe, expect, it } from "vitest";
import { parseProfileRequest } from "./uploader-profile";

describe("parseProfileRequest", () => {
  it("accepts a display name and visibility", () => {
    expect(
      parseProfileRequest({ displayName: "Мила Јовановић", defaultVisibility: "private" }),
    ).toEqual({ displayName: "Мила Јовановић", defaultVisibility: "private" });
  });

  it("trims surrounding whitespace from the name", () => {
    expect(
      parseProfileRequest({ displayName: "  Mila  ", defaultVisibility: "public" }),
    ).toEqual({ displayName: "Mila", defaultVisibility: "public" });
  });

  it("rejects a missing or blank name", () => {
    expect(parseProfileRequest({ defaultVisibility: "public" })).toBeNull();
    expect(parseProfileRequest({ displayName: "   ", defaultVisibility: "public" })).toBeNull();
  });

  it("rejects a name longer than 80 characters", () => {
    expect(
      parseProfileRequest({ displayName: "x".repeat(81), defaultVisibility: "public" }),
    ).toBeNull();
  });

  it("rejects unknown visibility values", () => {
    expect(parseProfileRequest({ displayName: "Mila", defaultVisibility: "friends" })).toBeNull();
    expect(parseProfileRequest({ displayName: "Mila" })).toBeNull();
  });

  it("rejects non-object bodies", () => {
    expect(parseProfileRequest(null)).toBeNull();
    expect(parseProfileRequest("Mila")).toBeNull();
  });
});
