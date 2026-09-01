import { describe, expect, it } from "vitest";
import {
  ADMIN_EXPORT,
  exportAutoCreates,
  exportDownloadName,
  exportStoragePath,
  exportTakesPrivate,
  exportGuestCancelPath,
  exportGuestPath,
  exportTargetQuery,
  parseExportTarget,
  PUBLIC_EXPORT,
  uploaderExport,
  formatDayMonth,
  linkExpiresAt,
  resolveExportState,
  formatSize,
  PACKING_ETA_WARMUP_MS,
  packingEtaMs,
  parseExportStatus,
  parsePrepareRequest,
} from "./export";

describe("formatSize", () => {
  it("formats gigabytes with one decimal", () => {
    expect(formatSize(4_200_000_000)).toBe("4.2 GB");
    expect(formatSize(12_400_000_000)).toBe("12 GB");
  });

  it("formats megabytes below a gigabyte", () => {
    expect(formatSize(850_000_000)).toBe("850 MB");
    expect(formatSize(120_000)).toBe("1 MB");
  });
});

describe("parseExportStatus", () => {
  it("accepts a full status", () => {
    expect(
      parseExportStatus({ state: "packing", done: 3, total: 10, sizeBytes: 42 }),
    ).toEqual({ state: "packing", done: 3, total: 10, sizeBytes: 42, expiresAt: null });
  });

  it("rejects unknown states", () => {
    expect(parseExportStatus({ state: "nope" })).toBeNull();
    expect(parseExportStatus(null)).toBeNull();
  });
});

describe("parseExportStatus (cancelled)", () => {
  it("accepts a cancelled job", () => {
    expect(parseExportStatus({ state: "cancelled", done: 0, total: 0 })).toEqual({
      state: "cancelled",
      done: 0,
      total: 0,
      sizeBytes: null,
      expiresAt: null,
    });
  });
});

describe("packingEtaMs", () => {
  const at = 1_000_000;

  it("shows nothing until the warmup has elapsed", () => {
    expect(
      packingEtaMs({ done: 0, at }, { done: 20, at: at + PACKING_ETA_WARMUP_MS - 1 }, 184),
    ).toBeNull();
  });

  it("shows nothing when no photo has been packed since the first sample", () => {
    expect(
      packingEtaMs({ done: 118, at }, { done: 118, at: at + PACKING_ETA_WARMUP_MS }, 184),
    ).toBeNull();
  });

  it("extrapolates the observed rate over the photos still to pack", () => {
    // 20 photos in 10 s leaves 164 photos → 82 s.
    expect(
      packingEtaMs({ done: 0, at }, { done: 20, at: at + 10_000 }, 184),
    ).toBe(82_000);
  });

  it("measures from the first sample, not from zero", () => {
    // Joined at 100 of 184; 42 more in 10 s leaves 42 → 10 s.
    expect(
      packingEtaMs({ done: 100, at }, { done: 142, at: at + 10_000 }, 184),
    ).toBe(10_000);
  });
});

describe("link validity", () => {
  it("holds through the end of the seventh Belgrade day after the zip became ready", () => {
    expect(linkExpiresAt(new Date("2026-08-27T14:00:00Z"))).toBe(
      "2026-09-03T21:59:59.999Z",
    );
    expect(formatDayMonth(linkExpiresAt(new Date("2026-08-27T14:00:00Z")))).toBe("03.09.");
    // Late evening UTC is already the next Belgrade day.
    expect(linkExpiresAt(new Date("2026-08-27T22:30:00Z"))).toBe(
      "2026-09-04T21:59:59.999Z",
    );
  });

  it("formats the expiry as a Belgrade DD.MM. date", () => {
    expect(formatDayMonth("2026-09-03T22:30:00Z")).toBe("04.09.");
    expect(formatDayMonth("2026-01-31T10:00:00Z")).toBe("31.01.");
  });

  it("reports a ready job as expired once its deadline has passed", () => {
    const now = new Date("2026-09-03T14:00:00Z");
    expect(resolveExportState("ready", "2026-09-03T14:00:00.000Z", now)).toBe("expired");
    expect(resolveExportState("ready", "2026-09-03T14:00:01.000Z", now)).toBe("ready");
    expect(resolveExportState("ready", null, now)).toBe("ready");
    expect(resolveExportState("packing", "2020-01-01T00:00:00Z", now)).toBe("packing");
  });

  it("parses the expiry alongside the state", () => {
    expect(
      parseExportStatus({
        state: "expired",
        done: 184,
        total: 184,
        sizeBytes: 1,
        expiresAt: "2026-09-03T14:00:00.000Z",
      }),
    ).toEqual({
      state: "expired",
      done: 184,
      total: 184,
      sizeBytes: 1,
      expiresAt: "2026-09-03T14:00:00.000Z",
    });
    expect(parseExportStatus({ state: "packing" })?.expiresAt).toBeNull();
  });
});

describe("parsePrepareRequest", () => {
  it("reads the private-photos choice", () => {
    expect(parsePrepareRequest({ includePrivate: false })).toEqual({ includePrivate: false });
    expect(parsePrepareRequest({ includePrivate: true })).toEqual({ includePrivate: true });
  });

  it("includes private photos when the body says nothing", () => {
    expect(parsePrepareRequest(null)).toEqual({ includePrivate: true });
    expect(parsePrepareRequest({})).toEqual({ includePrivate: true });
    expect(parsePrepareRequest({ includePrivate: "no" })).toEqual({ includePrivate: true });
  });
});

const GUEST = "11111111-2222-3333-4444-555555555555";
const GUEST_PUBLIC_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("export targets", () => {
  it("gives each target its own object in the bucket", () => {
    expect(exportStoragePath(PUBLIC_EXPORT)).toBe("public.zip");
    expect(exportStoragePath(ADMIN_EXPORT)).toBe("admin.zip");
    expect(exportStoragePath(uploaderExport(GUEST))).toBe(`uploader/${GUEST}.zip`);
  });

  it("names the download after whose photos it holds", () => {
    expect(exportDownloadName(PUBLIC_EXPORT)).toBe("fotografije.zip");
    expect(exportDownloadName(ADMIN_EXPORT)).toBe("sve-fotografije.zip");
    expect(exportDownloadName(uploaderExport(GUEST))).toBe("moje-fotografije.zip");
  });

  it("keeps private photos out of the public zip only", () => {
    expect(exportTakesPrivate(PUBLIC_EXPORT)).toBe(false);
    expect(exportTakesPrivate(ADMIN_EXPORT)).toBe(true);
    expect(exportTakesPrivate(uploaderExport(GUEST))).toBe(true);
  });

  it("never creates a guest's zip without being asked", () => {
    expect(exportAutoCreates(PUBLIC_EXPORT)).toBe(true);
    expect(exportAutoCreates(ADMIN_EXPORT)).toBe(true);
    expect(exportAutoCreates(uploaderExport(GUEST))).toBe(false);
  });

  it("round-trips through the build worker's query string", () => {
    for (const target of [PUBLIC_EXPORT, ADMIN_EXPORT, uploaderExport(GUEST)]) {
      const params = new URLSearchParams(exportTargetQuery(target));
      expect(parseExportTarget(params.get("kind"), params.get("uploader"))).toEqual(target);
    }
  });

  it("rejects a mismatched kind and uploader", () => {
    expect(parseExportTarget("uploader", null)).toBeNull();
    expect(parseExportTarget("public", GUEST)).toBeNull();
    expect(parseExportTarget("nope", null)).toBeNull();
    expect(parseExportTarget(null, null)).toBeNull();
  });
});

describe("the admin's per-guest export paths", () => {
  it("addresses a guest's zip by the public id their page uses", () => {
    expect(exportGuestPath(GUEST_PUBLIC_ID)).toBe(
      `/api/export/admin/guests/${GUEST_PUBLIC_ID}`,
    );
    expect(exportGuestCancelPath(GUEST_PUBLIC_ID)).toBe(
      `/api/export/admin/guests/${GUEST_PUBLIC_ID}/cancel`,
    );
  });
});
