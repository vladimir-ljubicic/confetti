import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  parseSelection,
  parseVisibilitySelection,
  resolveSelection,
  SELECTION_MAX_IDS,
  type SelectedPhoto,
} from "./bulk-selection";

describe("parseSelection", () => {
  it("reads distinct ids from a JSON body", () => {
    expect(parseSelection({ ids: ["a", "b", "a"] })).toEqual(["a", "b"]);
  });

  it("rejects non-object bodies, missing, empty, oversized and non-string ids", () => {
    expect(parseSelection(null)).toBeNull();
    expect(parseSelection("a")).toBeNull();
    expect(parseSelection({})).toBeNull();
    expect(parseSelection({ ids: "a" })).toBeNull();
    expect(parseSelection({ ids: [] })).toBeNull();
    expect(parseSelection({ ids: ["a", 1] })).toBeNull();
    expect(parseSelection({ ids: Array(SELECTION_MAX_IDS + 1).fill("a") })).toBeNull();
  });
});

describe("parseVisibilitySelection", () => {
  it("reads ids and the target visibility", () => {
    expect(parseVisibilitySelection({ ids: ["a"], visibility: "private" })).toEqual({
      ids: ["a"],
      visibility: "private",
    });
  });

  it("rejects a body missing either part", () => {
    expect(parseVisibilitySelection({ ids: ["a"] })).toBeNull();
    expect(parseVisibilitySelection({ visibility: "public" })).toBeNull();
    expect(parseVisibilitySelection({ ids: ["a"], visibility: "friends" })).toBeNull();
  });
});

function fakeClient(rows: SelectedPhoto[], pages: number[] = []): SupabaseClient {
  const query = {
    select: () => query,
    eq: () => query,
    is: () => query,
    order: () => query,
    range: async (from: number, to: number) => {
      pages.push(from);
      return { data: rows.slice(from, to + 1), error: null };
    },
  };
  return { from: () => query } as unknown as SupabaseClient;
}

function photos(count: number): SelectedPhoto[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${String(i).padStart(5, "0")}`,
    visibility: i % 2 === 0 ? "public" : "private",
  }));
}

describe("resolveSelection", () => {
  it("returns the selected photos the guest owns, in id order, across pages", async () => {
    const pages: number[] = [];
    const rows = photos(1500);
    const found = await resolveSelection(fakeClient(rows, pages), "device", [
      "p01200",
      "p00003",
      "stranger",
    ]);
    expect(found).toEqual([rows[3], rows[1200]]);
    expect(pages).toEqual([0, 1000]);
  });

  it("stops after a short page", async () => {
    const pages: number[] = [];
    await resolveSelection(fakeClient(photos(12), pages), "device", ["p00001"]);
    expect(pages).toEqual([0]);
  });

  it("reads one more page when a page is full", async () => {
    const pages: number[] = [];
    const found = await resolveSelection(fakeClient(photos(1000), pages), "device", [
      "p00999",
    ]);
    expect(found).toHaveLength(1);
    expect(pages).toEqual([0, 1000]);
  });

  it("throws when the query fails", async () => {
    const query = {
      select: () => query,
      eq: () => query,
      is: () => query,
      order: () => query,
      range: async () => ({ data: null, error: { message: "boom" } }),
    };
    const client = { from: () => query } as unknown as SupabaseClient;
    await expect(resolveSelection(client, "device", ["a"])).rejects.toThrow(
      "Loading own photos failed: boom",
    );
  });
});
