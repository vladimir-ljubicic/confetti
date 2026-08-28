import { describe, expect, it } from "vitest";
import {
  decodeGalleryCursor,
  encodeGalleryCursor,
  galleryCursorFilter,
  type GalleryCursor,
} from "./gallery-cursor";

const cursor: GalleryCursor = {
  likeCount: 12,
  uploadedAt: "2026-08-18T01:26:27.123456+00:00",
  id: "3f1c9b64-1f4a-4f6e-9d2b-8a0c7e5d4b31",
};

describe("gallery cursors", () => {
  it("round-trips a cursor", () => {
    expect(decodeGalleryCursor(encodeGalleryCursor(cursor))).toEqual(cursor);
  });

  it("survives an encoded cursor in a query string", () => {
    const params = new URLSearchParams({ cursor: encodeGalleryCursor(cursor) });
    const parsed = new URLSearchParams(params.toString()).get("cursor");
    expect(decodeGalleryCursor(parsed ?? "")).toEqual(cursor);
  });

  it("rejects a cursor that is not three fields", () => {
    expect(decodeGalleryCursor(Buffer.from("12|x").toString("base64url"))).toBeNull();
  });

  it("rejects a non-numeric like count", () => {
    const raw = `x|${cursor.uploadedAt}|${cursor.id}`;
    expect(decodeGalleryCursor(Buffer.from(raw).toString("base64url"))).toBeNull();
  });

  it("rejects an unparseable timestamp", () => {
    const raw = `12|yesterday|${cursor.id}`;
    expect(decodeGalleryCursor(Buffer.from(raw).toString("base64url"))).toBeNull();
  });

  it("rejects an id that is not a uuid", () => {
    const raw = `12|${cursor.uploadedAt}|1; drop table photos`;
    expect(decodeGalleryCursor(Buffer.from(raw).toString("base64url"))).toBeNull();
  });

  it("rejects garbage", () => {
    expect(decodeGalleryCursor("not-a-cursor")).toBeNull();
  });
});

describe("galleryCursorFilter", () => {
  it("follows upload time, then id, for latest", () => {
    expect(galleryCursorFilter("latest", cursor)).toBe(
      `uploaded_at.lt."${cursor.uploadedAt}",and(uploaded_at.eq."${cursor.uploadedAt}",id.lt.${cursor.id})`,
    );
  });

  it("follows like count, then upload time, then id, for popular", () => {
    expect(galleryCursorFilter("popular", cursor)).toBe(
      [
        "like_count.lt.12",
        `and(like_count.eq.12,uploaded_at.lt."${cursor.uploadedAt}")`,
        `and(like_count.eq.12,uploaded_at.eq."${cursor.uploadedAt}",id.lt.${cursor.id})`,
      ].join(","),
    );
  });
});
