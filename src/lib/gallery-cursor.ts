import type { SortMode } from "./sort-mode";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The last row of a page, in the terms every gallery sort orders by.
export type GalleryCursor = {
  likeCount: number;
  uploadedAt: string;
  id: string;
};

export function encodeGalleryCursor(cursor: GalleryCursor): string {
  return Buffer.from(
    `${cursor.likeCount}|${cursor.uploadedAt}|${cursor.id}`,
  ).toString("base64url");
}

// Cursors arrive from the client, so every field is checked before it reaches
// a query: an id that is not a uuid makes Postgres error rather than not match.
export function decodeGalleryCursor(value: string): GalleryCursor | null {
  const parts = Buffer.from(value, "base64url").toString().split("|");
  if (parts.length !== 3) return null;
  const [likeCount, uploadedAt, id] = parts;
  if (!/^\d+$/.test(likeCount)) return null;
  if (Number.isNaN(Date.parse(uploadedAt))) return null;
  if (!UUID_PATTERN.test(id)) return null;
  return { likeCount: Number(likeCount), uploadedAt, id };
}

// PostgREST `or` expression matching the rows that follow the cursor in the
// sort's own key order. Timestamps are quoted: unquoted, their punctuation
// reads as filter syntax.
export function galleryCursorFilter(
  sort: SortMode,
  cursor: GalleryCursor,
): string {
  const time = `"${cursor.uploadedAt}"`;
  if (sort === "popular") {
    return [
      `like_count.lt.${cursor.likeCount}`,
      `and(like_count.eq.${cursor.likeCount},uploaded_at.lt.${time})`,
      `and(like_count.eq.${cursor.likeCount},uploaded_at.eq.${time},id.lt.${cursor.id})`,
    ].join(",");
  }
  return [
    `uploaded_at.lt.${time}`,
    `and(uploaded_at.eq.${time},id.lt.${cursor.id})`,
  ].join(",");
}
