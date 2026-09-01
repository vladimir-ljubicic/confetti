import { describe, expect, it } from "vitest";
import {
  comparePhotos,
  resolveSortMode,
  sortToggleShown,
  sumLikes,
  type SortablePhoto,
} from "./sort-mode";

describe("resolveSortMode", () => {
  it("honors an explicit latest choice", () => {
    expect(resolveSortMode("latest")).toBe("latest");
  });

  it("honors an explicit popular choice", () => {
    expect(resolveSortMode("popular")).toBe("popular");
  });

  it("defaults to latest when unset", () => {
    expect(resolveSortMode(undefined)).toBe("latest");
  });

  it("treats an unknown param as unset", () => {
    expect(resolveSortMode("newest")).toBe("latest");
  });

  it("falls back to latest for legacy params", () => {
    expect(resolveSortMode("live")).toBe("latest");
    expect(resolveSortMode("chrono")).toBe("latest");
  });
});

describe("comparePhotos", () => {
  const photo = (
    id: string,
    uploadedAt: string,
    likeCount: number,
  ): SortablePhoto => ({ id, uploadedAt, likeCount });

  const order = (sort: "latest" | "popular", photos: SortablePhoto[]) =>
    [...photos].sort(comparePhotos(sort)).map((entry) => entry.id);

  it("puts the newest upload first", () => {
    expect(
      order("latest", [
        photo("a", "2026-08-01T10:00:00Z", 0),
        photo("b", "2026-08-03T10:00:00Z", 0),
        photo("c", "2026-08-02T10:00:00Z", 0),
      ]),
    ).toEqual(["b", "c", "a"]);
  });

  it("puts the most liked first, newest breaking the tie", () => {
    expect(
      order("popular", [
        photo("a", "2026-08-01T10:00:00Z", 5),
        photo("b", "2026-08-03T10:00:00Z", 9),
        photo("c", "2026-08-02T10:00:00Z", 5),
      ]),
    ).toEqual(["b", "c", "a"]);
  });

  it("breaks a full tie on the id, so the order is total", () => {
    const tied = [
      photo("a", "2026-08-01T10:00:00Z", 3),
      photo("c", "2026-08-01T10:00:00Z", 3),
      photo("b", "2026-08-01T10:00:00Z", 3),
    ];
    expect(order("popular", tied)).toEqual(["c", "b", "a"]);
    expect(order("latest", tied)).toEqual(["c", "b", "a"]);
  });

  it("ignores like counts when sorting by latest", () => {
    expect(
      order("latest", [
        photo("a", "2026-08-01T10:00:00Z", 99),
        photo("b", "2026-08-02T10:00:00Z", 0),
      ]),
    ).toEqual(["b", "a"]);
  });
});

describe("sumLikes", () => {
  it("adds up every photo's likes", () => {
    expect(sumLikes([{ likeCount: 3 }, { likeCount: 0 }, { likeCount: 7 }])).toBe(10);
  });

  it("counts an empty gallery as no likes", () => {
    expect(sumLikes([])).toBe(0);
  });
});

describe("sortToggleShown", () => {
  it("hides the toggle below the like floor, where both orders read alike", () => {
    expect(sortToggleShown(9)).toBe(false);
  });

  it("shows the toggle at the like floor", () => {
    expect(sortToggleShown(10)).toBe(true);
  });

  it("shows the toggle above the like floor", () => {
    expect(sortToggleShown(48)).toBe(true);
  });

  it("hides the toggle for a gallery with no likes at all", () => {
    expect(sortToggleShown(0)).toBe(false);
  });
});
