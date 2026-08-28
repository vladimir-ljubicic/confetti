import { describe, expect, it } from "vitest";
import { parseSettingsPatch } from "./upload-freeze";

describe("parseSettingsPatch", () => {
  it("accepts a boolean uploadsFrozen field", () => {
    expect(parseSettingsPatch({ uploadsFrozen: true })).toEqual({
      uploadsFrozen: true,
    });
    expect(parseSettingsPatch({ uploadsFrozen: false })).toEqual({
      uploadsFrozen: false,
    });
  });

  it("accepts an event date and offset", () => {
    expect(parseSettingsPatch({ eventDate: "2026-09-20" })).toEqual({
      eventDate: "2026-09-20",
    });
    expect(parseSettingsPatch({ freezeOffsetDays: 0 })).toEqual({
      freezeOffsetDays: 0,
    });
    expect(
      parseSettingsPatch({ uploadsFrozen: true, eventDate: "2026-10-01", freezeOffsetDays: 3 }),
    ).toEqual({ uploadsFrozen: true, eventDate: "2026-10-01", freezeOffsetDays: 3 });
  });

  it("rejects invalid field values", () => {
    expect(parseSettingsPatch({ uploadsFrozen: "true" })).toBeNull();
    expect(parseSettingsPatch({ uploadsFrozen: 1 })).toBeNull();
    expect(parseSettingsPatch({ eventDate: "20.09.2026" })).toBeNull();
    expect(parseSettingsPatch({ eventDate: "2026-02-30" })).toBeNull();
    expect(parseSettingsPatch({ freezeOffsetDays: -1 })).toBeNull();
    expect(parseSettingsPatch({ freezeOffsetDays: 1.5 })).toBeNull();
    expect(parseSettingsPatch({ freezeOffsetDays: "7" })).toBeNull();
  });

  it("rejects a valid field alongside an invalid one", () => {
    expect(parseSettingsPatch({ uploadsFrozen: true, eventDate: "soon" })).toBeNull();
  });

  it("rejects empty and non-object bodies", () => {
    expect(parseSettingsPatch({})).toBeNull();
    expect(parseSettingsPatch(null)).toBeNull();
    expect(parseSettingsPatch("frozen")).toBeNull();
  });
});
