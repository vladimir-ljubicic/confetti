import { describe, expect, it } from "vitest";
import { selectionView } from "./selection-view";

const photos = [
  { id: "a", visibility: "public" as const },
  { id: "b", visibility: "private" as const },
  { id: "c", visibility: "public" as const },
];

describe("selectionView", () => {
  it("shows the list as it is when nothing has been edited", () => {
    expect(selectionView(photos, { removed: new Set(), overrides: new Map() })).toEqual(
      photos,
    );
  });

  it("leaves out deleted photos and relabels re-labelled ones", () => {
    expect(
      selectionView(photos, {
        removed: new Set(["b"]),
        overrides: new Map([["a", "private" as const]]),
      }),
    ).toEqual([
      { id: "a", visibility: "private" },
      { id: "c", visibility: "public" },
    ]);
  });

  it("drops photos that no longer match the visibility on show", () => {
    expect(
      selectionView(
        photos,
        { removed: new Set(), overrides: new Map([["c", "private" as const]]) },
        "public",
      ),
    ).toEqual([{ id: "a", visibility: "public" }]);
  });
});
