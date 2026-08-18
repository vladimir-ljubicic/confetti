import { describe, expect, it } from "vitest";
import {
  parseProfileRequest,
  parseVisibility,
  parseVisibilityField,
} from "./uploader-profile";

describe("parseVisibilityField", () => {
  it("reads the named field from a JSON body", () => {
    expect(parseVisibilityField({ visibility: "private" }, "visibility")).toBe("private");
    expect(
      parseVisibilityField({ defaultVisibility: "public" }, "defaultVisibility"),
    ).toBe("public");
  });

  it("rejects non-object bodies and invalid values", () => {
    expect(parseVisibilityField(null, "visibility")).toBeNull();
    expect(parseVisibilityField("private", "visibility")).toBeNull();
    expect(parseVisibilityField({ visibility: "friends" }, "visibility")).toBeNull();
    expect(parseVisibilityField({}, "visibility")).toBeNull();
  });
});

describe("parseVisibility", () => {
  it("accepts the two visibility values", () => {
    expect(parseVisibility("public")).toBe("public");
    expect(parseVisibility("private")).toBe("private");
  });

  it("rejects anything else", () => {
    expect(parseVisibility("friends")).toBeNull();
    expect(parseVisibility("")).toBeNull();
    expect(parseVisibility(undefined)).toBeNull();
    expect(parseVisibility(null)).toBeNull();
    expect(parseVisibility(42)).toBeNull();
  });
});

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
