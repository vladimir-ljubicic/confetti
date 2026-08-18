export const TRANSFORM_SOURCE_LIMIT_BYTES = 25 * 1024 * 1024;

// One width for every gallery render path, so transforms and client-generated
// thumbnails deliver the same size.
export const GALLERY_IMAGE_WIDTH = 800;

export function needsThumbnail(sizeBytes: number): boolean {
  return sizeBytes > TRANSFORM_SOURCE_LIMIT_BYTES;
}

export type ImageSource =
  | { kind: "transform" }
  | { kind: "original" }
  | { kind: "thumbnail" };

export function imageSource(input: {
  sizeBytes: number;
  transformsEnabled: boolean;
  hasThumbnail: boolean;
}): ImageSource {
  if (needsThumbnail(input.sizeBytes)) {
    return input.hasThumbnail ? { kind: "thumbnail" } : { kind: "original" };
  }
  if (!input.transformsEnabled) return { kind: "original" };
  return { kind: "transform" };
}
