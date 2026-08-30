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

// Rendition paths are canonical, the same in whichever bucket holds them;
// which bucket that is follows from the photo's visibility.
export function thumbnailPath(photoId: string): string {
  return `${photoId}/thumb.jpg`;
}

// The 1600px full-screen rendition.
export function viewerPath(photoId: string): string {
  return `${photoId}/viewer.jpg`;
}

export function renditionPaths(photoId: string): string[] {
  return [thumbnailPath(photoId), viewerPath(photoId)];
}
