import { describe, expect, it } from "vitest";
import { evaluateUpload, parseUploadLimits } from "./upload-limits";

const limits = {
  maxBatch: 50,
  maxPerWindow: 100,
  windowMinutes: 15,
  maxFileBytes: 50 * 1024 * 1024,
};

describe("evaluateUpload", () => {
  it("accepts an upload within all limits", () => {
    expect(
      evaluateUpload({ fileBytes: 1024, batchSize: 1, recentCount: 0 }, limits),
    ).toEqual({ ok: true });
  });

  it("rejects a file over the size limit", () => {
    expect(
      evaluateUpload(
        { fileBytes: 50 * 1024 * 1024 + 1, batchSize: 1, recentCount: 0 },
        limits,
      ),
    ).toEqual({ ok: false, reason: "file-size" });
  });

  it("rejects a batch larger than the batch limit", () => {
    expect(
      evaluateUpload({ fileBytes: 1024, batchSize: 51, recentCount: 0 }, limits),
    ).toEqual({ ok: false, reason: "batch" });
  });

  it("accepts a batch exactly at the batch limit", () => {
    expect(
      evaluateUpload({ fileBytes: 1024, batchSize: 50, recentCount: 0 }, limits),
    ).toEqual({ ok: true });
  });

  it("rejects an upload once the device filled the window", () => {
    expect(
      evaluateUpload({ fileBytes: 1024, batchSize: 1, recentCount: 100 }, limits),
    ).toEqual({ ok: false, reason: "window" });
  });

  it("accepts the upload that reaches the window limit", () => {
    expect(
      evaluateUpload({ fileBytes: 1024, batchSize: 1, recentCount: 99 }, limits),
    ).toEqual({ ok: true });
  });
});

describe("parseUploadLimits", () => {
  it("returns defaults when no env vars are set", () => {
    expect(parseUploadLimits({})).toEqual({
      maxBatch: 50,
      maxPerWindow: 100,
      windowMinutes: 15,
      maxFileBytes: 50 * 1024 * 1024,
    });
  });

  it("reads overrides from env vars", () => {
    expect(
      parseUploadLimits({
        UPLOAD_MAX_BATCH: "10",
        UPLOAD_MAX_PER_WINDOW: "20",
        UPLOAD_WINDOW_MINUTES: "5",
        UPLOAD_MAX_FILE_MB: "2",
      }),
    ).toEqual({
      maxBatch: 10,
      maxPerWindow: 20,
      windowMinutes: 5,
      maxFileBytes: 2 * 1024 * 1024,
    });
  });

  it("falls back to defaults for non-numeric or non-positive values", () => {
    expect(
      parseUploadLimits({
        UPLOAD_MAX_BATCH: "abc",
        UPLOAD_MAX_PER_WINDOW: "0",
        UPLOAD_WINDOW_MINUTES: "-3",
        UPLOAD_MAX_FILE_MB: "",
      }),
    ).toEqual({
      maxBatch: 50,
      maxPerWindow: 100,
      windowMinutes: 15,
      maxFileBytes: 50 * 1024 * 1024,
    });
  });
});
