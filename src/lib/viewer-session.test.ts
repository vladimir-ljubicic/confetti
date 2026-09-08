import { describe, expect, it } from "vitest";
import { noSessions, openedOn, withoutSession } from "./viewer-session";

describe("openedOn", () => {
  it("opens on the photo the tap named", () => {
    expect(openedOn(noSessions, { startId: "a" }).open).toEqual({
      startId: "a",
      session: 1,
    });
  });

  it("gives a session opened over another one a number of its own", () => {
    const first = openedOn(noSessions, { startId: "a" });
    expect(openedOn(first, { startId: "b" }).open?.session).not.toBe(
      first.open?.session,
    );
  });

  it("gives a second look at the same photo a session of its own", () => {
    const first = openedOn(noSessions, { startId: "a" });
    expect(openedOn(first, { startId: "a" }).open?.session).not.toBe(
      first.open?.session,
    );
  });

  it("never numbers a session like the one that has just closed", () => {
    const closed = openedOn(noSessions, { startId: "a" });
    const gone = withoutSession(closed, closed.open!.session);
    expect(openedOn(gone, { startId: "b" }).open?.session).not.toBe(
      closed.open?.session,
    );
  });
});

describe("withoutSession", () => {
  it("closes the session that asked", () => {
    const opened = openedOn(noSessions, { startId: "a" });
    expect(withoutSession(opened, opened.open!.session).open).toBeNull();
  });

  it("leaves standing the photo a tap opened while the last session was still leaving", () => {
    const leaving = openedOn(noSessions, { startId: "a" });
    const opened = openedOn(leaving, { startId: "b" });
    expect(withoutSession(opened, leaving.open!.session)).toBe(opened);
  });

  it("closes nothing when nothing is open", () => {
    expect(withoutSession(noSessions, 1)).toBe(noSessions);
  });
});
