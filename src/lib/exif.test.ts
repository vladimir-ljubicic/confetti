import { describe, expect, it } from "vitest";
import { extractTakenAt } from "./exif";

// Minimal JPEG: SOI + APP1(Exif/TIFF with one IFD0 entry pointing at an Exif
// IFD holding the given ASCII tags) + EOI.
function jpegWithExif(tags: Array<[tag: number, value: string]>): Uint8Array {
  const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));
  const u16le = (value: number) => [value & 0xff, value >> 8];
  const u32le = (value: number) => [
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    (value >> 24) & 0xff,
  ];

  const exifIfdOffset = 26;
  let dataOffset = exifIfdOffset + 2 + tags.length * 12 + 4;
  const entries: number[] = [];
  const data: number[] = [];
  for (const [tag, value] of tags) {
    const bytes = [...ascii(value), 0];
    entries.push(...u16le(tag), ...u16le(2), ...u32le(bytes.length), ...u32le(dataOffset));
    data.push(...bytes);
    dataOffset += bytes.length;
  }

  const tiff = [
    ...ascii("II"), ...u16le(0x2a), ...u32le(8),
    // IFD0: one entry — ExifIFDPointer (0x8769)
    ...u16le(1),
    ...u16le(0x8769), ...u16le(4), ...u32le(1), ...u32le(exifIfdOffset),
    ...u32le(0),
    ...u16le(tags.length),
    ...entries,
    ...u32le(0),
    ...data,
  ];
  const app1Body = [...ascii("Exif"), 0, 0, ...tiff];
  const app1Length = app1Body.length + 2;
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe1, app1Length >> 8, app1Length & 0xff, ...app1Body,
    0xff, 0xd9,
  ]);
}

const DATE_TIME_ORIGINAL = 0x9003;
const OFFSET_TIME_ORIGINAL = 0x9011;

describe("extractTakenAt", () => {
  it("applies the EXIF timezone offset when the photo has one", async () => {
    const jpeg = jpegWithExif([
      [DATE_TIME_ORIGINAL, "2026:09:20 15:04:05"],
      [OFFSET_TIME_ORIGINAL, "+11:30"],
    ]);
    await expect(extractTakenAt(jpeg)).resolves.toBe("2026-09-20T03:34:05.000Z");
  });

  it("reads an offsetless taken time in the extracting device's zone", async () => {
    const jpeg = jpegWithExif([[DATE_TIME_ORIGINAL, "2026:09:20 15:04:05"]]);
    const expected = new Date(2026, 8, 20, 15, 4, 5).toISOString();
    await expect(extractTakenAt(jpeg)).resolves.toBe(expected);
  });

  it("returns null when the image has no EXIF block", async () => {
    const bareJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    await expect(extractTakenAt(bareJpeg)).resolves.toBeNull();
  });

  it("returns null for a buffer that is not an image", async () => {
    await expect(extractTakenAt(new Uint8Array([1, 2, 3, 4]))).resolves.toBeNull();
  });
});
