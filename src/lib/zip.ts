// Store-only ZIP writer with a fully deterministic layout: every byte offset
// and the total archive size are computable from entry names and sizes alone,
// before any file data is read. That lets the packer resume an interrupted
// upload at any 6 MB boundary by regenerating bytes from the covering entry.
// CRCs are only needed in the central directory (local headers carry the
// data-descriptor flag), so they can be collected while streaming.

export type ZipEntry = {
  name: string;
  size: number;
  // Wall-clock parts for the DOS timestamp (ZIP has no timezone).
  mtime: DosClock;
};

export type DosClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export type ZipEntryLayout = {
  headerStart: number;
  dataStart: number;
  end: number;
  nameLength: number;
  zip64Offset: boolean;
};

export type ZipPlan = {
  entries: ZipEntryLayout[];
  centralDirectoryStart: number;
  centralDirectorySize: number;
  zip64: boolean;
  totalSize: number;
};

const LOCAL_HEADER_BASE = 30;
const DESCRIPTOR_SIZE = 16;
const CENTRAL_ENTRY_BASE = 46;
const EOCD_SIZE = 22;
const ZIP64_EOCD_SIZE = 56;
const ZIP64_LOCATOR_SIZE = 20;
const ZIP64_EXTRA_SIZE = 12;
const LIMIT_32 = 0xffffffff;
const LIMIT_16 = 0xffff;

// Bit 3: sizes/CRC follow the data in a descriptor. Bit 11: UTF-8 names.
const FLAGS = 0x0808;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array, seed = 0): number {
  let crc = ~seed >>> 0;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return ~crc >>> 0;
}

function nameLength(name: string): number {
  return Buffer.byteLength(name, "utf8");
}

export function planZip(entries: { name: string; size: number }[]): ZipPlan {
  let offset = 0;
  const layouts: ZipEntryLayout[] = entries.map((entry) => {
    const nameLen = nameLength(entry.name);
    const headerStart = offset;
    const dataStart = headerStart + LOCAL_HEADER_BASE + nameLen;
    const end = dataStart + entry.size + DESCRIPTOR_SIZE;
    offset = end;
    return {
      headerStart,
      dataStart,
      end,
      nameLength: nameLen,
      zip64Offset: headerStart >= LIMIT_32,
    };
  });
  const centralDirectoryStart = offset;
  const centralDirectorySize = layouts.reduce(
    (sum, layout) =>
      sum +
      CENTRAL_ENTRY_BASE +
      layout.nameLength +
      (layout.zip64Offset ? ZIP64_EXTRA_SIZE : 0),
    0,
  );
  const zip64 =
    centralDirectoryStart >= LIMIT_32 ||
    centralDirectorySize >= LIMIT_32 ||
    layouts.length > LIMIT_16;
  const totalSize =
    centralDirectoryStart +
    centralDirectorySize +
    (zip64 ? ZIP64_EOCD_SIZE + ZIP64_LOCATOR_SIZE : 0) +
    EOCD_SIZE;
  return { entries: layouts, centralDirectoryStart, centralDirectorySize, zip64, totalSize };
}

export function dosDateTime(clock: DosClock): { date: number; time: number } {
  const year = Math.min(Math.max(clock.year, 1980), 2107);
  return {
    date: ((year - 1980) << 9) | (clock.month << 5) | clock.day,
    time: (clock.hour << 11) | (clock.minute << 5) | (clock.second >> 1),
  };
}

export function localHeader(entry: ZipEntry): Buffer {
  const nameLen = nameLength(entry.name);
  const buf = Buffer.alloc(LOCAL_HEADER_BASE + nameLen);
  const { date, time } = dosDateTime(entry.mtime);
  buf.writeUInt32LE(0x04034b50, 0);
  buf.writeUInt16LE(20, 4); // version needed
  buf.writeUInt16LE(FLAGS, 6);
  buf.writeUInt16LE(0, 8); // store
  buf.writeUInt16LE(time, 10);
  buf.writeUInt16LE(date, 12);
  // CRC and sizes live in the data descriptor.
  buf.writeUInt32LE(0, 14);
  buf.writeUInt32LE(0, 18);
  buf.writeUInt32LE(0, 22);
  buf.writeUInt16LE(nameLen, 26);
  buf.writeUInt16LE(0, 28);
  buf.write(entry.name, LOCAL_HEADER_BASE, "utf8");
  return buf;
}

export function dataDescriptor(crc: number, size: number): Buffer {
  const buf = Buffer.alloc(DESCRIPTOR_SIZE);
  buf.writeUInt32LE(0x08074b50, 0);
  buf.writeUInt32LE(crc, 4);
  buf.writeUInt32LE(size, 8);
  buf.writeUInt32LE(size, 12);
  return buf;
}

export function centralDirectory(
  entries: ZipEntry[],
  crcs: number[],
  plan: ZipPlan,
): Buffer {
  const parts = entries.map((entry, i) => {
    const layout = plan.entries[i];
    const buf = Buffer.alloc(
      CENTRAL_ENTRY_BASE + layout.nameLength + (layout.zip64Offset ? ZIP64_EXTRA_SIZE : 0),
    );
    const { date, time } = dosDateTime(entry.mtime);
    buf.writeUInt32LE(0x02014b50, 0);
    buf.writeUInt16LE(45, 4); // version made by
    buf.writeUInt16LE(layout.zip64Offset ? 45 : 20, 6);
    buf.writeUInt16LE(FLAGS, 8);
    buf.writeUInt16LE(0, 10); // store
    buf.writeUInt16LE(time, 12);
    buf.writeUInt16LE(date, 14);
    buf.writeUInt32LE(crcs[i], 16);
    buf.writeUInt32LE(entry.size, 20);
    buf.writeUInt32LE(entry.size, 24);
    buf.writeUInt16LE(layout.nameLength, 28);
    buf.writeUInt16LE(layout.zip64Offset ? ZIP64_EXTRA_SIZE : 0, 30);
    buf.writeUInt16LE(0, 32); // comment length
    buf.writeUInt16LE(0, 34); // disk number
    buf.writeUInt16LE(0, 36); // internal attrs
    buf.writeUInt32LE(0, 38); // external attrs
    buf.writeUInt32LE(layout.zip64Offset ? LIMIT_32 : layout.headerStart, 42);
    buf.write(entry.name, CENTRAL_ENTRY_BASE, "utf8");
    if (layout.zip64Offset) {
      const extraStart = CENTRAL_ENTRY_BASE + layout.nameLength;
      buf.writeUInt16LE(0x0001, extraStart);
      buf.writeUInt16LE(8, extraStart + 2);
      buf.writeBigUInt64LE(BigInt(layout.headerStart), extraStart + 4);
    }
    return buf;
  });
  return Buffer.concat(parts);
}

export function endOfCentralDirectory(plan: ZipPlan): Buffer {
  const count = plan.entries.length;
  const eocd = Buffer.alloc(EOCD_SIZE);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(Math.min(count, LIMIT_16), 8);
  eocd.writeUInt16LE(Math.min(count, LIMIT_16), 10);
  eocd.writeUInt32LE(Math.min(plan.centralDirectorySize, LIMIT_32), 12);
  eocd.writeUInt32LE(Math.min(plan.centralDirectoryStart, LIMIT_32), 16);
  eocd.writeUInt16LE(0, 20);
  if (!plan.zip64) return eocd;

  const zip64End = Buffer.alloc(ZIP64_EOCD_SIZE);
  zip64End.writeUInt32LE(0x06064b50, 0);
  zip64End.writeBigUInt64LE(BigInt(ZIP64_EOCD_SIZE - 12), 4);
  zip64End.writeUInt16LE(45, 12);
  zip64End.writeUInt16LE(45, 14);
  zip64End.writeUInt32LE(0, 16);
  zip64End.writeUInt32LE(0, 20);
  zip64End.writeBigUInt64LE(BigInt(count), 24);
  zip64End.writeBigUInt64LE(BigInt(count), 32);
  zip64End.writeBigUInt64LE(BigInt(plan.centralDirectorySize), 40);
  zip64End.writeBigUInt64LE(BigInt(plan.centralDirectoryStart), 48);

  const locator = Buffer.alloc(ZIP64_LOCATOR_SIZE);
  locator.writeUInt32LE(0x07064b50, 0);
  locator.writeUInt32LE(0, 4);
  locator.writeBigUInt64LE(
    BigInt(plan.centralDirectoryStart + plan.centralDirectorySize),
    8,
  );
  locator.writeUInt32LE(1, 16);

  return Buffer.concat([zip64End, locator, eocd]);
}
