import { describe, expect, it } from "vitest";
import { groupPhotosByUploader } from "./admin-photos";

function photo(id: string, uploader: { publicId: string; displayName: string } | null) {
  return { id, uploader };
}

describe("groupPhotosByUploader", () => {
  it("groups consecutive and non-consecutive photos by uploader, preserving photo order", () => {
    const ana = { publicId: "pub-ana", displayName: "Ana" };
    const marko = { publicId: "pub-marko", displayName: "Marko" };
    const groups = groupPhotosByUploader([
      photo("1", marko),
      photo("2", ana),
      photo("3", marko),
    ]);

    expect(groups).toEqual([
      { uploader: ana, photos: [photo("2", ana)] },
      { uploader: marko, photos: [photo("1", marko), photo("3", marko)] },
    ]);
  });

  it("puts photos without an uploader profile in a last group", () => {
    const ana = { publicId: "pub-ana", displayName: "Ana" };
    const groups = groupPhotosByUploader([photo("1", null), photo("2", ana)]);

    expect(groups).toEqual([
      { uploader: ana, photos: [photo("2", ana)] },
      { uploader: null, photos: [photo("1", null)] },
    ]);
  });
});
