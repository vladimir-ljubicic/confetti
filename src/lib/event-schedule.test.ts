import { describe, expect, it } from "vitest";
import {
  addDays,
  formatEventDate,
  freezeDue,
  uploadFreezeAt,
} from "./event-schedule";

describe("addDays", () => {
  it("adds within a month", () => {
    expect(addDays("2026-09-20", 7)).toBe("2026-09-27");
  });

  it("rolls over month and year boundaries", () => {
    expect(addDays("2026-09-28", 5)).toBe("2026-10-03");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("supports a zero offset", () => {
    expect(addDays("2026-09-20", 0)).toBe("2026-09-20");
  });
});

describe("uploadFreezeAt", () => {
  it("is midnight Belgrade after the offset lapses (summer time)", () => {
    const at = uploadFreezeAt({ eventDateIso: "2026-09-20", freezeOffsetDays: 7 });
    expect(at.toISOString()).toBe(new Date("2026-09-27T00:00:00+02:00").toISOString());
  });

  it("uses the winter offset when the window ends after the DST switch", () => {
    const at = uploadFreezeAt({ eventDateIso: "2026-10-25", freezeOffsetDays: 7 });
    expect(at.toISOString()).toBe(new Date("2026-11-01T00:00:00+01:00").toISOString());
  });
});

describe("freezeDue", () => {
  const schedule = { eventDateIso: "2026-09-20", freezeOffsetDays: 7 };

  it("is false before the freeze moment", () => {
    expect(freezeDue(schedule, new Date("2026-09-26T21:59:59Z"))).toBe(false);
  });

  it("is true at and after the freeze moment", () => {
    expect(freezeDue(schedule, new Date("2026-09-26T22:00:00Z"))).toBe(true);
    expect(freezeDue(schedule, new Date("2026-10-01T00:00:00Z"))).toBe(true);
  });
});

describe("formatEventDate", () => {
  it("renders day-first with the given separator", () => {
    expect(formatEventDate("2026-09-20", ".")).toBe("20.09.2026");
    expect(formatEventDate("2026-09-20", " · ")).toBe("20 · 09 · 2026");
  });
});
