import { describe, expect, it } from "vitest";
import {
  centralDirectory,
  crc32,
  dataDescriptor,
  dosDateTime,
  endOfCentralDirectory,
  localHeader,
  planZip,
  type ZipEntry,
} from "./zip";

const clock = { year: 2026, month: 9, day: 20, hour: 18, minute: 32, second: 45 };

describe("crc32", () => {
  it("matches known vectors", () => {
    expect(crc32(Buffer.from(""))).toBe(0);
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
    expect(crc32(Buffer.from("hello"))).toBe(0x3610a686);
  });

  it("chains across chunks via the seed", () => {
    const whole = crc32(Buffer.from("123456789"));
    const first = crc32(Buffer.from("12345"));
    expect(crc32(Buffer.from("6789"), first)).toBe(whole);
  });
});

describe("planZip", () => {
  it("computes deterministic offsets and total size", () => {
    const entries = [
      { name: "Ана/a.jpg", size: 10 },
      { name: "Ана/b.jpg", size: 20 },
    ];
    const plan = planZip(entries);
    // "Ана" is 6 bytes in UTF-8, so each name is 6 + 6 = 12 bytes.
    expect(plan.entries[0]).toMatchObject({
      headerStart: 0,
      dataStart: 42,
      end: 68,
    });
    expect(plan.entries[1].headerStart).toBe(68);
    expect(plan.centralDirectoryStart).toBe(68 + 30 + 12 + 20 + 16);
    expect(plan.centralDirectorySize).toBe(2 * (46 + 12));
    expect(plan.zip64).toBe(false);
    expect(plan.totalSize).toBe(
      plan.centralDirectoryStart + plan.centralDirectorySize + 22,
    );
  });

  it("switches to zip64 when offsets pass 4 GiB", () => {
    const big = { name: "a", size: 0x1_2000_0000 };
    const plan = planZip([big, big, big, big]);
    expect(plan.entries[3].zip64Offset).toBe(true);
    expect(plan.zip64).toBe(true);
    expect(plan.totalSize).toBe(
      plan.centralDirectoryStart + plan.centralDirectorySize + 56 + 20 + 22,
    );
  });
});

describe("zip records", () => {
  it("produces an archive whose central directory parses back", () => {
    const files: [string, Buffer][] = [
      ["Ана/one.jpg", Buffer.from("first file")],
      ["Боба/two.jpg", Buffer.from("second, longer file body")],
    ];
    const entries: ZipEntry[] = files.map(([name, data]) => ({
      name,
      size: data.length,
      mtime: clock,
    }));
    const plan = planZip(entries);
    const crcs = files.map(([, data]) => crc32(data));
    const archive = Buffer.concat([
      ...files.flatMap(([, data], i) => [
        localHeader(entries[i]),
        data,
        dataDescriptor(crcs[i], data.length),
      ]),
      centralDirectory(entries, crcs, plan),
      endOfCentralDirectory(plan),
    ]);
    expect(archive.length).toBe(plan.totalSize);

    // End of central directory.
    const eocd = archive.length - 22;
    expect(archive.readUInt32LE(eocd)).toBe(0x06054b50);
    expect(archive.readUInt16LE(eocd + 10)).toBe(2);
    expect(archive.readUInt32LE(eocd + 12)).toBe(plan.centralDirectorySize);
    expect(archive.readUInt32LE(eocd + 16)).toBe(plan.centralDirectoryStart);

    // First central entry points at the first local header.
    let at = plan.centralDirectoryStart;
    files.forEach(([name, data], i) => {
      expect(archive.readUInt32LE(at)).toBe(0x02014b50);
      expect(archive.readUInt32LE(at + 16)).toBe(crcs[i]);
      expect(archive.readUInt32LE(at + 20)).toBe(data.length);
      const nameLen = archive.readUInt16LE(at + 28);
      expect(archive.readUInt32LE(at + 42)).toBe(plan.entries[i].headerStart);
      expect(archive.subarray(at + 46, at + 46 + nameLen).toString("utf8")).toBe(name);
      const local = plan.entries[i].headerStart;
      expect(archive.readUInt32LE(local)).toBe(0x04034b50);
      expect(
        archive
          .subarray(plan.entries[i].dataStart, plan.entries[i].dataStart + data.length)
          .equals(data),
      ).toBe(true);
      at += 46 + nameLen;
    });
  });

  it("encodes dos date and time", () => {
    const { date, time } = dosDateTime(clock);
    expect(date).toBe(((2026 - 1980) << 9) | (9 << 5) | 20);
    expect(time).toBe((18 << 11) | (32 << 5) | (45 >> 1));
  });
});
