import { describe, expect, it } from "vitest";
import {
  classifyUploadFailure,
  failureFromStatus,
  isPhotoUpload,
  isRetryableFailure,
  precheckUpload,
  UNSUPPORTED_MEDIA_TYPE_STATUS,
  UploadFailedError,
} from "./upload-failure";

describe("isRetryableFailure", () => {
  it("lets the guest retry transport failures", () => {
    expect(isRetryableFailure("network")).toBe(true);
    expect(isRetryableFailure("server")).toBe(true);
  });

  it("refuses to retry what the file itself makes impossible", () => {
    expect(isRetryableFailure("too-large")).toBe(false);
    expect(isRetryableFailure("not-an-image")).toBe(false);
  });
});

describe("isPhotoUpload", () => {
  it("accepts any image content type", () => {
    expect(isPhotoUpload({ contentType: "image/jpeg", filename: "a.jpg" })).toBe(true);
    expect(isPhotoUpload({ contentType: "IMAGE/HEIC", filename: "a.heic" })).toBe(true);
  });

  it("accepts an image extension when the browser reports no usable type", () => {
    expect(
      isPhotoUpload({ contentType: "application/octet-stream", filename: "IMG_1.HEIC" }),
    ).toBe(true);
  });

  it("rejects other content types", () => {
    expect(isPhotoUpload({ contentType: "video/mp4", filename: "clip.mp4" })).toBe(false);
    expect(isPhotoUpload({ contentType: "text/plain", filename: "notes.txt" })).toBe(false);
  });

  it("rejects a file with neither an image type nor an image extension", () => {
    expect(
      isPhotoUpload({ contentType: "application/octet-stream", filename: "archive" }),
    ).toBe(false);
  });

  it("does not let an image extension override a type that names something else", () => {
    expect(isPhotoUpload({ contentType: "video/mp4", filename: "clip.jpg" })).toBe(false);
  });
});

describe("precheckUpload", () => {
  const photo = { sizeBytes: 1024, contentType: "image/jpeg", filename: "a.jpg" };

  it("passes a photo within the size limit", () => {
    expect(precheckUpload(photo, 2048)).toBeNull();
  });

  it("catches an oversized photo before it leaves the device", () => {
    expect(precheckUpload({ ...photo, sizeBytes: 4096 }, 2048)).toBe("too-large");
  });

  it("catches a file that is not a photo", () => {
    expect(
      precheckUpload({ ...photo, contentType: "video/mp4", filename: "clip.mp4" }, 2048),
    ).toBe("not-an-image");
  });

  it("names the file's own problem before the size limit", () => {
    expect(
      precheckUpload(
        { sizeBytes: 4096, contentType: "video/mp4", filename: "clip.mp4" },
        2048,
      ),
    ).toBe("not-an-image");
  });

  it("skips the size limit for devices exempt from it", () => {
    expect(precheckUpload({ ...photo, sizeBytes: 4096 }, null)).toBeNull();
  });
});

describe("failureFromStatus", () => {
  it("reads a refused media type as not a photo", () => {
    expect(failureFromStatus(UNSUPPORTED_MEDIA_TYPE_STATUS)).toBe("not-an-image");
  });

  it("reads every other error status as a server failure", () => {
    expect(failureFromStatus(500)).toBe("server");
    expect(failureFromStatus(403)).toBe("server");
  });
});

describe("classifyUploadFailure", () => {
  it("keeps the reason an already-classified failure carries", () => {
    expect(classifyUploadFailure(new UploadFailedError("too-large"))).toBe("too-large");
  });

  it("reads a failed fetch as a lost connection", () => {
    expect(classifyUploadFailure(new TypeError("Failed to fetch"))).toBe("network");
  });

  it("reads a tus error without a response as a lost connection", () => {
    const error = Object.assign(new Error("tus"), {
      originalRequest: {},
      originalResponse: null,
    });
    expect(classifyUploadFailure(error)).toBe("network");
  });

  it("reads a tus error carrying a response as a server failure", () => {
    const error = Object.assign(new Error("tus"), {
      originalRequest: {},
      originalResponse: { getStatus: () => 500 },
    });
    expect(classifyUploadFailure(error)).toBe("server");
  });

  it("falls back to a server failure for anything unrecognised", () => {
    expect(classifyUploadFailure(new Error("boom"))).toBe("server");
    expect(classifyUploadFailure(null)).toBe("server");
  });
});
