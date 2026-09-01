import { describe, expect, it } from "vitest";
import {
  adminFilterSearch,
  adminFilterUrl,
  adminGalleryFilter,
  adminGuestUrl,
  parseAdminFilter,
  type AdminFilter,
} from "./admin-filter";

const UPLOADER = "0f1c8a3e-4c2b-4a1d-9b5e-1f2a3b4c5d6e";

const FILTERS: AdminFilter[] = [
  {},
  { visibility: "private" },
  { visibility: "public" },
  { uploader: UPLOADER },
  { uploader: UPLOADER, visibility: "private" },
  { uploader: UPLOADER, visibility: "public" },
];

function parseUrl(url: string): AdminFilter {
  const params = new URL(url, "https://example.test").searchParams;
  return parseAdminFilter({
    uploader: params.get("uploader") ?? undefined,
    filter: params.get("filter") ?? undefined,
  });
}

describe("parseAdminFilter", () => {
  it("reads a visibility", () => {
    expect(parseAdminFilter({ filter: "private" })).toEqual({ visibility: "private" });
    expect(parseAdminFilter({ filter: "public" })).toEqual({ visibility: "public" });
  });

  it("reads an uploader, taking the first of repeated params", () => {
    expect(parseAdminFilter({ uploader: [UPLOADER, "other"] })).toEqual({
      uploader: UPLOADER,
    });
  });

  it("reads a guest narrowed to one visibility", () => {
    expect(parseAdminFilter({ uploader: UPLOADER, filter: "public" })).toEqual({
      uploader: UPLOADER,
      visibility: "public",
    });
  });

  it("falls back to the whole gallery", () => {
    expect(parseAdminFilter({ filter: "nonsense" })).toEqual({});
  });
});

describe("adminFilterSearch", () => {
  it("asks the feed for both halves of the filter", () => {
    expect(adminFilterSearch({ uploader: UPLOADER, visibility: "private" })).toBe(
      `uploader=${UPLOADER}&filter=private`,
    );
    expect(adminFilterSearch({})).toBe("");
  });
});

describe("adminFilterUrl", () => {
  it("round-trips through the address it writes", () => {
    for (const filter of FILTERS) {
      expect(parseUrl(adminFilterUrl(filter))).toEqual(filter);
    }
  });
});

describe("adminGuestUrl", () => {
  it("names the guest in the path and carries only the visibility", () => {
    expect(adminGuestUrl({ uploader: UPLOADER })).toBe(`/admin/guests/${UPLOADER}`);
    expect(adminGuestUrl({ uploader: UPLOADER, visibility: "public" })).toBe(
      `/admin/guests/${UPLOADER}?filter=public`,
    );
  });

  it("round-trips its visibility, the guest coming from the path", () => {
    for (const visibility of ["public", "private"] as const) {
      expect(parseUrl(adminGuestUrl({ uploader: UPLOADER, visibility })).visibility).toBe(
        visibility,
      );
    }
  });
});

describe("adminGalleryFilter", () => {
  it("keeps what the whole gallery's chips can light up", () => {
    expect(adminGalleryFilter({})).toEqual({});
    expect(adminGalleryFilter({ visibility: "private" })).toEqual({
      visibility: "private",
    });
    expect(adminGalleryFilter({ uploader: UPLOADER })).toEqual({ uploader: UPLOADER });
  });

  it("drops a slice no chip offers", () => {
    expect(adminGalleryFilter({ visibility: "public" })).toEqual({});
    expect(adminGalleryFilter({ uploader: UPLOADER, visibility: "private" })).toEqual({
      uploader: UPLOADER,
    });
  });
});
