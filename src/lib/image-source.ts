export const TRANSFORM_SOURCE_LIMIT_BYTES = 25 * 1024 * 1024;

export type ImageSource = { kind: "transform" } | { kind: "original" };

export function imageSource(input: {
  sizeBytes: number;
  transformsEnabled: boolean;
}): ImageSource {
  if (!input.transformsEnabled) return { kind: "original" };
  if (input.sizeBytes > TRANSFORM_SOURCE_LIMIT_BYTES) return { kind: "original" };
  return { kind: "transform" };
}
