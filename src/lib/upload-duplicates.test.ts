import { describe, expect, it } from "vitest";
import { partitionDuplicates } from "./upload-duplicates";

const item = (name: string, hash: string | null) => ({ name, hash });

describe("partitionDuplicates", () => {
  it("keeps every photo whose content this guest has not uploaded", () => {
    const items = [item("a", "aa"), item("b", "bb")];
    expect(partitionDuplicates(items, new Set(["cc"]))).toEqual({
      fresh: items,
      skipped: [],
    });
  });

  it("leaves out the ones already uploaded", () => {
    const fresh = item("b", "bb");
    const uploaded = [item("a", "aa"), item("c", "cc")];
    const result = partitionDuplicates(
      [uploaded[0], fresh, uploaded[1]],
      new Set(["aa", "cc"]),
    );
    expect(result).toEqual({ fresh: [fresh], skipped: uploaded });
  });

  it("keeps the first of a repeated content and leaves out the rest", () => {
    const first = item("a", "aa");
    const copies = [item("copy", "aa"), item("copy2", "aa")];
    const result = partitionDuplicates([first, ...copies], new Set());
    expect(result).toEqual({ fresh: [first], skipped: copies });
  });

  it("keeps a photo whose content could not be hashed", () => {
    const unhashed = item("a", null);
    const other = item("b", null);
    expect(partitionDuplicates([unhashed, other], new Set())).toEqual({
      fresh: [unhashed, other],
      skipped: [],
    });
  });
});
