import { describe, expect, it } from "vitest";
import { shortUploaderName } from "./uploader-name";

describe("shortUploaderName", () => {
  it("formats first name plus last initial with a dot", () => {
    expect(shortUploaderName("Ana Marić")).toBe("Ana M.");
  });

  it("uses the last token for the initial with middle names present", () => {
    expect(shortUploaderName("Ana Petra Kovač")).toBe("Ana K.");
  });

  it("keeps a single-token name without an initial", () => {
    expect(shortUploaderName("Ana")).toBe("Ana");
  });

  it("keeps the initial as typed", () => {
    expect(shortUploaderName("ana marić")).toBe("ana m.");
  });

  it("ignores surrounding and repeated whitespace", () => {
    expect(shortUploaderName("  Ana   Marić  ")).toBe("Ana M.");
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(shortUploaderName("   ")).toBe("");
  });
});
