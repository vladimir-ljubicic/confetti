import { describe, expect, it } from "vitest";
import { headCoversView, mergeGallery } from "./gallery-head";

describe("headCoversView", () => {
  describe("with a gallery-wide head", () => {
    const head = { guestId: null, sort: "latest" } as const;

    it("covers the gallery in the head's own order", () => {
      expect(headCoversView(head, { guestId: null, sort: "latest" })).toBe(true);
    });

    it("does not cover another order", () => {
      expect(headCoversView(head, { guestId: null, sort: "popular" })).toBe(
        false,
      );
      expect(headCoversView(head, { guestId: "guest-a", sort: "popular" })).toBe(
        false,
      );
    });

    it("covers a guest narrowing in the head's own order", () => {
      expect(headCoversView(head, { guestId: "guest-a", sort: "latest" })).toBe(
        true,
      );
    });
  });

  describe("with a head scoped to one guest", () => {
    const head = { guestId: "guest-a", sort: "latest" } as const;

    it("covers that guest in any order", () => {
      expect(headCoversView(head, { guestId: "guest-a", sort: "latest" })).toBe(
        true,
      );
      expect(headCoversView(head, { guestId: "guest-a", sort: "popular" })).toBe(
        true,
      );
    });

    it("does not cover the gallery at large", () => {
      expect(headCoversView(head, { guestId: null, sort: "latest" })).toBe(
        false,
      );
    });

    it("does not cover another guest", () => {
      expect(headCoversView(head, { guestId: "guest-b", sort: "latest" })).toBe(
        false,
      );
    });
  });
});

describe("mergeGallery", () => {
  const photo = (id: string, likeCount = 0) => ({ id, likeCount });

  it("shows the head alone until a fetch lands", () => {
    const head = [photo("a"), photo("b")];
    expect(mergeGallery(head, null)).toBe(head);
  });

  it("hands over to a fetch begun against the current head", () => {
    const head = [photo("a"), photo("b")];
    const fetched = [photo("b"), photo("c")];
    expect(mergeGallery(head, { photos: fetched, head })).toBe(fetched);
  });

  it("drops a photo the fresher fetch no longer holds", () => {
    const head = [photo("a"), photo("b")];
    const fetched = [photo("b")];
    expect(mergeGallery(head, { photos: fetched, head })).toEqual([photo("b")]);
  });

  it("lets a head re-rendered after the fetch win where both hold a photo", () => {
    const head = [photo("b", 5), photo("d")];
    const full = {
      photos: [photo("a"), photo("b", 2), photo("c")],
      head: [photo("a"), photo("b", 2)],
    };
    expect(mergeGallery(head, full)).toEqual([
      photo("b", 5),
      photo("d"),
      photo("a"),
      photo("c"),
    ]);
  });
});
