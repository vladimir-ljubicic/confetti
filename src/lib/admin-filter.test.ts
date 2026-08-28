import { describe, expect, it } from "vitest";
import {
  adminFilterUrl,
  parseAdminFilter,
  type AdminFilter,
} from "./admin-filter";

const UPLOADER = "0f1c8a3e-4c2b-4a1d-9b5e-1f2a3b4c5d6e";

describe("parseAdminFilter", () => {
  it("reads the private filter", () => {
    expect(parseAdminFilter({ filter: "private" })).toEqual({ kind: "private" });
  });

  it("reads an uploader, taking the first of repeated params", () => {
    expect(parseAdminFilter({ uploader: [UPLOADER, "other"] })).toEqual({
      kind: "uploader",
      publicId: UPLOADER,
    });
  });

  it("falls back to the whole gallery", () => {
    expect(parseAdminFilter({ filter: "nonsense" })).toEqual({ kind: "all" });
  });
});

describe("adminFilterUrl", () => {
  it("round-trips through the address it writes", () => {
    const filters: AdminFilter[] = [
      { kind: "all" },
      { kind: "private" },
      { kind: "uploader", publicId: UPLOADER },
    ];
    for (const filter of filters) {
      const url = new URL(adminFilterUrl(filter), "https://example.test");
      expect(
        parseAdminFilter({
          uploader: url.searchParams.get("uploader") ?? undefined,
          filter: url.searchParams.get("filter") ?? undefined,
        }),
      ).toEqual(filter);
    }
  });
});
