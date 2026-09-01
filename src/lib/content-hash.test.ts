import { describe, expect, it } from "vitest";
import { hashBlob, hashBlobs, isContentHash } from "./content-hash";

describe("hashBlob", () => {
  it("names the content, not the file", async () => {
    const one = await hashBlob(new Blob(["photo"], { type: "image/jpeg" }));
    const other = await hashBlob(new Blob(["photo"], { type: "image/png" }));
    expect(one).toBe(other);
    expect(one).toMatch(/^[0-9a-f]{64}$/);
  });

  it("tells different content apart", async () => {
    expect(await hashBlob(new Blob(["a"]))).not.toBe(
      await hashBlob(new Blob(["b"])),
    );
  });
});

describe("hashBlobs", () => {
  it("answers in the order it was asked", async () => {
    const blobs = [new Blob(["a"]), new Blob(["b"]), new Blob(["a"])];
    const hashes = await hashBlobs(blobs);
    expect(hashes).toHaveLength(3);
    expect(hashes[0]).toBe(hashes[2]);
    expect(hashes[0]).not.toBe(hashes[1]);
  });
});

describe("isContentHash", () => {
  it("accepts a sha-256 in lowercase hex", () => {
    expect(isContentHash("a".repeat(64))).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isContentHash("A".repeat(64))).toBe(false);
    expect(isContentHash("a".repeat(63))).toBe(false);
    expect(isContentHash("")).toBe(false);
    expect(isContentHash(42)).toBe(false);
  });
});
