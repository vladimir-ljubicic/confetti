import { describe, expect, it } from "vitest";
import { restartLatest, resumeSort, type SortScroll } from "./sort-scroll";

describe("resumeSort", () => {
  it("lands at the top of an order the guest has not stood in", () => {
    expect(resumeSort({}, "latest", "popular", 640)).toEqual({
      memory: { latest: 640 },
      scrollTo: 0,
    });
  });

  it("resumes the place the guest left in that order", () => {
    const memory: SortScroll = { popular: 320 };
    expect(resumeSort(memory, "latest", "popular", 640)).toEqual({
      memory: { latest: 640, popular: 320 },
      scrollTo: 320,
    });
  });

  it("keeps the place of the order being left", () => {
    const { memory } = resumeSort({ latest: 90 }, "latest", "popular", 640);
    expect(memory.latest).toBe(640);
  });

  it("leaves the memory it was given alone", () => {
    const memory: SortScroll = { latest: 90 };
    resumeSort(memory, "latest", "popular", 640);
    expect(memory).toEqual({ latest: 90 });
  });
});

describe("restartLatest", () => {
  it("lands at the top of the latest order and forgets the place there", () => {
    expect(restartLatest({ latest: 320 }, "popular", 640)).toEqual({
      memory: { popular: 640, latest: 0 },
      scrollTo: 0,
    });
  });

  it("forgets the place of the latest order restarted from within itself", () => {
    expect(restartLatest({}, "latest", 640)).toEqual({
      memory: { latest: 0 },
      scrollTo: 0,
    });
  });
});
