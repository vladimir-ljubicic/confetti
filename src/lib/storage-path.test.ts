import { describe, expect, it } from "vitest";
import { storagePath } from "./storage-path";

const uploader = "11111111-1111-4111-8111-111111111111";
const photo = "22222222-2222-4222-8222-222222222222";

describe("storagePath", () => {
  it("builds <uploaderId>/<photoId>.<ext> from the original filename", () => {
    expect(storagePath(uploader, photo, "IMG_1234.JPG", "image/jpeg")).toBe(
      `${uploader}/${photo}.jpg`,
    );
  });

  it("keeps heic extensions", () => {
    expect(storagePath(uploader, photo, "IMG_1234.HEIC", "image/heic")).toBe(
      `${uploader}/${photo}.heic`,
    );
  });

  it("falls back to the content type when the filename has no usable extension", () => {
    expect(storagePath(uploader, photo, "photo", "image/png")).toBe(
      `${uploader}/${photo}.png`,
    );
  });

  it("ignores unsafe extensions and derives from content type", () => {
    expect(storagePath(uploader, photo, "x.sh", "image/webp")).toBe(
      `${uploader}/${photo}.webp`,
    );
  });

  it("uses .bin when nothing usable is known", () => {
    expect(storagePath(uploader, photo, "photo", "application/octet-stream")).toBe(
      `${uploader}/${photo}.bin`,
    );
  });
});
