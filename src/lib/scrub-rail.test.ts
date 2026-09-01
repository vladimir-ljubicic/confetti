import { describe, expect, it } from "vitest";
import {
  SCRUB_THUMB_HEIGHT,
  dragProgress,
  likeThresholds,
  scrollProgress,
  scrubBubble,
  scrubRailShown,
  scrubScrollTop,
  scrubbedIndex,
  type ScrubLabels,
} from "./scrub-rail";

const labels: ScrubLabels = {
  morning: "јутро",
  afternoon: "поподне",
  evening: "вече",
  night: "ноћ",
  dearest: "Најдраже",
  loved: "Вољене",
  noLikes: "Без лајкова",
};

describe("scrubRailShown", () => {
  it("stays away from a gallery a few flicks long", () => {
    expect(scrubRailShown(300)).toBe(false);
  });

  it("mounts above three hundred photos", () => {
    expect(scrubRailShown(301)).toBe(true);
  });
});

describe("scrollProgress", () => {
  it("is nothing at the top and everything at the bottom", () => {
    expect(scrollProgress(0, 5000, 800)).toBe(0);
    expect(scrollProgress(4200, 5000, 800)).toBe(1);
  });

  it("measures the distance travelled through the scrollable range", () => {
    expect(scrollProgress(2100, 5000, 800)).toBeCloseTo(0.5);
  });

  it("is nothing when the page does not scroll", () => {
    expect(scrollProgress(0, 800, 800)).toBe(0);
  });

  it("holds inside its range past a bouncing scroll", () => {
    expect(scrollProgress(-40, 5000, 800)).toBe(0);
    expect(scrollProgress(4600, 5000, 800)).toBe(1);
  });
});

describe("scrubScrollTop", () => {
  it("reaches the bottom of the scrollable range", () => {
    expect(scrubScrollTop(1, 5000, 800)).toBe(4200);
  });

  it("mirrors the progress it was measured from", () => {
    expect(scrubScrollTop(scrollProgress(2100, 5000, 800), 5000, 800)).toBeCloseTo(
      2100,
    );
  });
});

describe("scrubbedIndex", () => {
  it("lands on the first photo at the top and the last at the bottom", () => {
    expect(scrubbedIndex(0, 400)).toBe(0);
    expect(scrubbedIndex(1, 400)).toBe(399);
  });

  it("lands halfway through the list halfway down", () => {
    expect(scrubbedIndex(0.5, 400)).toBe(200);
  });

  it("has nothing to point at in an empty list", () => {
    expect(scrubbedIndex(0.5, 0)).toBe(-1);
  });
});

describe("dragProgress", () => {
  it("holds the thumb where the finger grabbed it", () => {
    // Grabbed 20px below the thumb's top, with the thumb 100px down a track
    // starting at 120: the finger has not moved, so neither has the progress.
    expect(dragProgress(240, 20, { top: 120, height: 560 })).toBeCloseTo(
      100 / (560 - SCRUB_THUMB_HEIGHT),
    );
  });

  it("stays within the track however far past its ends the finger goes", () => {
    expect(dragProgress(0, 20, { top: 120, height: 560 })).toBe(0);
    expect(dragProgress(4000, 20, { top: 120, height: 560 })).toBe(1);
  });
});

describe("likeThresholds", () => {
  it("takes the bands from the album's own distribution", () => {
    // 10% of the album at 24 likes or more, 40% at 10 or more, 70% at 5 or
    // more: the three bands the percentiles fall on.
    const counts = [
      ...Array(30).fill(0),
      ...Array(30).fill(5),
      ...Array(30).fill(10),
      ...Array(10).fill(24),
    ];
    expect(likeThresholds(counts)).toEqual([24, 10, 5]);
  });

  it("drops a band the album cannot fill", () => {
    // Only the top slice has likes at all, so the lower percentiles sit at
    // zero and there is no band under the highest one.
    const counts = [...Array(90).fill(0), ...Array(10).fill(24)];
    expect(likeThresholds(counts)).toEqual([24]);
  });

  it("keeps one band where two percentiles fall on the same count", () => {
    const counts = [...Array(50).fill(0), ...Array(50).fill(3)];
    expect(likeThresholds(counts)).toEqual([3]);
  });

  it("has no bands in an album nobody has liked", () => {
    expect(likeThresholds(Array(100).fill(0))).toEqual([]);
  });

  it("has no bands in an empty album", () => {
    expect(likeThresholds([])).toEqual([]);
  });
});

describe("scrubBubble", () => {
  const photo = (likeCount: number) => ({
    uploadedAt: "2026-09-19T20:15:00Z",
    likeCount,
  });

  describe("in the latest order", () => {
    it("states the time of day the list is ordered by", () => {
      expect(scrubBubble(photo(0), "latest", [], "sr", labels)).toEqual({
        value: "22:15",
        heart: false,
        caption: "субота вече",
      });
    });

    it("reads the clock in the event's own time zone", () => {
      // Half past eleven UTC is already the small hours in Belgrade.
      expect(
        scrubBubble(
          { uploadedAt: "2026-09-19T23:30:00Z", likeCount: 0 },
          "latest",
          [],
          "sr",
          labels,
        ),
      ).toEqual({ value: "01:30", heart: false, caption: "недеља ноћ" });
    });

    it("names the day in the guest's language", () => {
      expect(
        scrubBubble(
          { uploadedAt: "2026-09-19T07:05:00Z", likeCount: 0 },
          "latest",
          [],
          "en",
          { ...labels, morning: "morning" },
        ),
      ).toEqual({ value: "09:05", heart: false, caption: "Saturday morning" });
    });
  });

  describe("in the popular order", () => {
    const thresholds = [24, 10, 5];

    it("names the band the photo under the thumb falls in", () => {
      expect(scrubBubble(photo(31), "popular", thresholds, "sr", labels)).toEqual({
        value: "24+",
        heart: true,
        caption: "Најдраже",
      });
      expect(scrubBubble(photo(10), "popular", thresholds, "sr", labels)).toEqual({
        value: "10+",
        heart: true,
        caption: "Вољене",
      });
    });

    it("leaves the lowest band of the three unnamed", () => {
      expect(scrubBubble(photo(6), "popular", thresholds, "sr", labels)).toEqual({
        value: "5+",
        heart: true,
        caption: null,
      });
    });

    it("states the likes of a photo below every band rather than none", () => {
      expect(scrubBubble(photo(2), "popular", thresholds, "sr", labels)).toEqual({
        value: "1+",
        heart: true,
        caption: null,
      });
    });

    it("says outright that a photo has no likes", () => {
      expect(scrubBubble(photo(0), "popular", thresholds, "sr", labels)).toEqual({
        value: "Без лајкова",
        heart: false,
        caption: null,
      });
    });

    it("names the top band of an album that fills only one", () => {
      expect(scrubBubble(photo(30), "popular", [24], "sr", labels)).toEqual({
        value: "24+",
        heart: true,
        caption: "Најдраже",
      });
    });
  });
});
