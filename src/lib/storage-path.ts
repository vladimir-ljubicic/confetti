const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "heic",
  "heif",
  "avif",
  "tif",
  "tiff",
  "bmp",
]);

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/avif": "avif",
  "image/tiff": "tiff",
  "image/bmp": "bmp",
};

export function storagePath(
  uploaderId: string,
  photoId: string,
  originalFilename: string,
  contentType: string,
): string {
  const fromName = originalFilename.split(".").pop()?.toLowerCase() ?? "";
  const ext = IMAGE_EXTENSIONS.has(fromName)
    ? fromName
    : (CONTENT_TYPE_EXTENSIONS[contentType.toLowerCase()] ?? "bin");
  return `${uploaderId}/${photoId}.${ext}`;
}

// Client-generated JPEG thumbnails always live next to the original.
export function thumbnailPath(uploaderId: string, photoId: string): string {
  return `${uploaderId}/${photoId}.thumb.jpg`;
}
