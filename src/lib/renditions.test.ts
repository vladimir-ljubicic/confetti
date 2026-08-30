import { StorageApiError, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { PHOTOS_BUCKET, RENDITIONS_BUCKET } from "./env";
import { moveRenditions, renditionsBucket } from "./renditions";

describe("renditionsBucket", () => {
  it("puts a public live photo's renditions in the public bucket", () => {
    expect(renditionsBucket({ visibility: "public", deleted_at: null })).toBe(
      RENDITIONS_BUCKET,
    );
  });

  it("puts a private photo's renditions in the private bucket", () => {
    expect(renditionsBucket({ visibility: "private", deleted_at: null })).toBe(
      PHOTOS_BUCKET,
    );
  });

  it("puts a deleted photo's renditions in the private bucket even when public", () => {
    expect(
      renditionsBucket({ visibility: "public", deleted_at: "2026-08-29T00:00:00Z" }),
    ).toBe(PHOTOS_BUCKET);
  });
});

type Move = { from: string; path: string; to: string };

function fakeClient(
  moves: Move[],
  errorFor: (move: Move) => StorageApiError | null = () => null,
): SupabaseClient {
  return {
    storage: {
      from: (from: string) => ({
        move: async (
          path: string,
          _target: string,
          options: { destinationBucket: string },
        ) => {
          const move = { from, path, to: options.destinationBucket };
          moves.push(move);
          return { error: errorFor(move) };
        },
      }),
    },
  } as unknown as SupabaseClient;
}

function missing(): StorageApiError {
  return new StorageApiError("Object not found", 400, "404", "storage", "NoSuchKey");
}

describe("moveRenditions", () => {
  it("moves each photo's thumb and viewer from the other bucket, keeping paths", async () => {
    const moves: Move[] = [];
    const ok = await moveRenditions(
      fakeClient(moves),
      [{ id: "p1" }, { id: "p2" }],
      RENDITIONS_BUCKET,
    );
    expect(ok).toBe(true);
    expect(moves).toEqual(
      expect.arrayContaining([
        { from: PHOTOS_BUCKET, path: "p1/thumb.jpg", to: RENDITIONS_BUCKET },
        { from: PHOTOS_BUCKET, path: "p1/viewer.jpg", to: RENDITIONS_BUCKET },
        { from: PHOTOS_BUCKET, path: "p2/thumb.jpg", to: RENDITIONS_BUCKET },
        { from: PHOTOS_BUCKET, path: "p2/viewer.jpg", to: RENDITIONS_BUCKET },
      ]),
    );
    expect(moves).toHaveLength(4);
  });

  it("tolerates renditions with nothing to move", async () => {
    const ok = await moveRenditions(fakeClient([], missing), [{ id: "p1" }], PHOTOS_BUCKET);
    expect(ok).toBe(true);
  });

  it("reports any other failure", async () => {
    const failed = (move: Move) =>
      move.path === "p1/thumb.jpg"
        ? new StorageApiError("boom", 500, "500", "storage", "InternalError")
        : null;
    const ok = await moveRenditions(fakeClient([], failed), [{ id: "p1" }], PHOTOS_BUCKET);
    expect(ok).toBe(false);
  });
});
