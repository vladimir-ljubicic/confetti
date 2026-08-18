import exifr from "exifr";

// EXIF taken times are naive ("2026:09:20 15:04:05"); the instant comes from
// OffsetTimeOriginal when present, the extracting device's zone otherwise.
export async function extractTakenAt(
  source: Blob | ArrayBuffer | Uint8Array,
): Promise<string | null> {
  try {
    const exif = await exifr.parse(source, {
      pick: ["DateTimeOriginal", "OffsetTimeOriginal"],
      reviveValues: false,
    });
    const raw = exif?.DateTimeOriginal;
    if (typeof raw !== "string") return null;
    const match = raw.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}:\d{2}:\d{2})$/);
    if (!match) return null;
    const offset =
      typeof exif.OffsetTimeOriginal === "string" &&
      /^[+-]\d{2}:\d{2}$/.test(exif.OffsetTimeOriginal.trim())
        ? exif.OffsetTimeOriginal.trim()
        : "";
    const takenAt = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}${offset}`);
    if (Number.isNaN(takenAt.getTime())) return null;
    return takenAt.toISOString();
  } catch {
    return null;
  }
}
