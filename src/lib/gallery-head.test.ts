import { describe, expect, it } from "vitest";
import { headCoversView } from "./gallery-head";

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
