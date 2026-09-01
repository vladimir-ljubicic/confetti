import { describe, expect, it } from "vitest";
import { openedOn, withoutSession } from "./viewer-session";

describe("openedOn", () => {
  it("opens on the photo the tap named", () => {
    expect(openedOn(null, { startId: "a" })).toEqual({ startId: "a", session: 1 });
  });

  it("gives a session opened over another one a number of its own", () => {
    const first = openedOn(null, { startId: "a" });
    expect(openedOn(first, { startId: "b" }).session).not.toBe(first.session);
  });

  it("gives a second look at the same photo a session of its own", () => {
    const first = openedOn(null, { startId: "a" });
    expect(openedOn(first, { startId: "a" }).session).not.toBe(first.session);
  });
});

describe("withoutSession", () => {
  it("closes the session that asked", () => {
    const open = openedOn(null, { startId: "a" });
    expect(withoutSession(open, open.session)).toBeNull();
  });

  it("leaves standing the photo a tap opened while the last session was still leaving", () => {
    const leaving = openedOn(null, { startId: "a" });
    const opened = openedOn(leaving, { startId: "b" });
    expect(withoutSession(opened, leaving.session)).toBe(opened);
  });

  it("closes nothing when nothing is open", () => {
    expect(withoutSession(null, 1)).toBeNull();
  });
});
