// One width for every gallery render path. Grids render from this thumbnail;
// the full-screen viewer sharpens it into the viewer rendition, and the
// original is only ever downloaded.
export const GALLERY_IMAGE_WIDTH = 800;

// Wide enough for the widest phone (~1290 physical px at 3×), where the
// viewer is width-constrained in both orientations.
export const VIEWER_IMAGE_WIDTH = 1600;

const RENDITION_JPEG_QUALITY = 0.8;

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

type Rendition = { blob: Blob; width: number; height: number };

async function renderJpeg(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  maxWidth: number,
): Promise<Rendition | null> {
  const scale = Math.min(1, maxWidth / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", RENDITION_JPEG_QUALITY);
  });
  return blob ? { blob, width: canvas.width, height: canvas.height } : null;
}

export type GeneratedRenditions = {
  thumb: Rendition;
  // Missing when the source is no wider than the thumb, which then already
  // carries every pixel the viewer could show.
  viewer: Blob | null;
};

// Downscaled JPEGs every photo is rendered from, generated on the uploader's
// device with a single decode feeding both sizes. Returns null when the
// browser cannot decode the file.
export async function generateRenditions(
  file: File,
): Promise<GeneratedRenditions | null> {
  try {
    const source = await decode(file);
    const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    if (!width || !height) return null;

    const thumb = await renderJpeg(source, width, height, GALLERY_IMAGE_WIDTH);
    const viewer =
      width > GALLERY_IMAGE_WIDTH
        ? await renderJpeg(source, width, height, VIEWER_IMAGE_WIDTH)
        : null;
    if (source instanceof ImageBitmap) source.close();
    if (!thumb) return null;
    return { thumb, viewer: viewer?.blob ?? null };
  } catch {
    return null;
  }
}
