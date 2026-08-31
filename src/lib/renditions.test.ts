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

type Move = { from: string; path: string; to: string; attempt: number };
type InFlight = { now: number; max: number };

function fakeClient(
  moves: Move[],
  errorFor: (move: Move) => StorageApiError | null = () => null,
  inFlight?: InFlight,
): SupabaseClient {
  const attempts = new Map<string, number>();
  return {
    storage: {
      from: (from: string) => ({
        move: async (
          path: string,
          _target: string,
          options: { destinationBucket: string },
        ) => {
          const attempt = attempts.get(path) ?? 0;
          attempts.set(path, attempt + 1);
          const move = { from, path, to: options.destinationBucket, attempt };
          moves.push(move);
          if (inFlight) {
            inFlight.now += 1;
            inFlight.max = Math.max(inFlight.max, inFlight.now);
            await new Promise((resolve) => setTimeout(resolve, 1));
            inFlight.now -= 1;
          }
          return { error: errorFor(move) };
        },
      }),
    },
  } as unknown as SupabaseClient;
}

function missing(): StorageApiError {
  return new StorageApiError("Object not found", 400, "404", "storage", "NoSuchKey");
}

function throttled(): StorageApiError {
  return new StorageApiError(
    "Too many connections issued to the database",
    429,
    "429",
    "storage",
    "SlowDown",
  );
}

function broken(): StorageApiError {
  return new StorageApiError("boom", 500, "500", "storage", "InternalError");
}

const noSleep = async () => {};

describe("moveRenditions", () => {
  it("moves each photo's thumb and viewer from the other bucket, keeping paths", async () => {
    const moves: Move[] = [];
    const outcome = await moveRenditions(
      fakeClient(moves),
      [{ id: "p1" }, { id: "p2" }],
      RENDITIONS_BUCKET,
    );
    expect(outcome).toEqual({ moved: ["p1", "p2"], failed: [] });
    expect(moves.map(({ from, path, to }) => ({ from, path, to }))).toEqual(
      expect.arrayContaining([
        { from: PHOTOS_BUCKET, path: "p1/thumb.jpg", to: RENDITIONS_BUCKET },
        { from: PHOTOS_BUCKET, path: "p1/viewer.jpg", to: RENDITIONS_BUCKET },
        { from: PHOTOS_BUCKET, path: "p2/thumb.jpg", to: RENDITIONS_BUCKET },
        { from: PHOTOS_BUCKET, path: "p2/viewer.jpg", to: RENDITIONS_BUCKET },
      ]),
    );
    expect(moves).toHaveLength(4);
  });

  it("counts renditions with nothing to move as in place", async () => {
    const outcome = await moveRenditions(fakeClient([], missing), [{ id: "p1" }], PHOTOS_BUCKET);
    expect(outcome).toEqual({ moved: ["p1"], failed: [] });
  });

  it("reports the photo whose rendition failed and keeps the others", async () => {
    const failThumb = (move: Move) => (move.path === "p1/thumb.jpg" ? broken() : null);
    const outcome = await moveRenditions(
      fakeClient([], failThumb),
      [{ id: "p1" }, { id: "p2" }],
      PHOTOS_BUCKET,
    );
    expect(outcome).toEqual({ moved: ["p2"], failed: ["p1"] });
  });

  it("retries a throttled move after a pause", async () => {
    const moves: Move[] = [];
    const sleeps: number[] = [];
    const throttleTwice = (move: Move) => (move.attempt < 2 ? throttled() : null);
    const outcome = await moveRenditions(
      fakeClient(moves, throttleTwice),
      [{ id: "p1" }],
      PHOTOS_BUCKET,
      { sleep: async (ms) => void sleeps.push(ms) },
    );
    expect(outcome).toEqual({ moved: ["p1"], failed: [] });
    expect(moves).toHaveLength(6);
    expect(sleeps.sort()).toEqual([200, 200, 400, 400]);
  });

  it("gives up on a move that stays throttled", async () => {
    const moves: Move[] = [];
    const outcome = await moveRenditions(
      fakeClient(moves, throttled),
      [{ id: "p1" }],
      PHOTOS_BUCKET,
      { sleep: noSleep },
    );
    expect(outcome).toEqual({ moved: [], failed: ["p1"] });
    expect(moves.filter((move) => move.path === "p1/thumb.jpg")).toHaveLength(6);
  });

  it("keeps at most the configured number of moves in flight", async () => {
    const inFlight: InFlight = { now: 0, max: 0 };
    const photos = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}` }));
    const outcome = await moveRenditions(
      fakeClient([], () => null, inFlight),
      photos,
      RENDITIONS_BUCKET,
      { concurrency: 3 },
    );
    expect(outcome.moved).toHaveLength(10);
    expect(inFlight.max).toBe(3);
  });
});
