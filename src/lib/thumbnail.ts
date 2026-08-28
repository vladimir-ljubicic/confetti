// One width for every gallery render path. Galleries and the photo viewer
// both render from this thumbnail; the original is only ever downloaded.
export const GALLERY_IMAGE_WIDTH = 800;

const THUMBNAIL_JPEG_QUALITY = 0.8;

// Only Safari decodes HEIC natively, and iPhones upload it. libheif is a few
// megabytes of wasm, so it loads only once the native paths have failed.
async function decodeHeic(file: File): Promise<ImageBitmap> {
  const { heicTo } = await import("heic-to");
  return await heicTo({ blob: file, type: "bitmap" });
}

async function decodeViaImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file);
  } catch {
    try {
      // Some browsers refuse certain formats in createImageBitmap but still
      // decode them through an <img> element.
      return await decodeViaImageElement(file);
    } catch {
      return await decodeHeic(file);
    }
  }
}

// Downscaled JPEG every photo is rendered from, generated on the uploader's
// device. Returns null when the browser cannot decode the file.
export async function generateThumbnail(file: File): Promise<Blob | null> {
  try {
    const source = await decode(file);
    const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    if (!width || !height) return null;

    const scale = Math.min(1, GALLERY_IMAGE_WIDTH / width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    if (source instanceof ImageBitmap) source.close();

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", THUMBNAIL_JPEG_QUALITY);
    });
  } catch {
    return null;
  }
}
