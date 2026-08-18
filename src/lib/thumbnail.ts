import { GALLERY_IMAGE_WIDTH } from "./image-source";

const THUMBNAIL_JPEG_QUALITY = 0.8;

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file);
  } catch {
    // Some browsers refuse certain formats in createImageBitmap but still
    // decode them through an <img> element.
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
}

// Downscaled JPEG for gallery rendering when the original is too large for
// image transforms. Returns null when the browser cannot decode the file.
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
