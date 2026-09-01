import { hasImageExtension } from "./storage-path";

// 415 Unsupported Media Type
export const UNSUPPORTED_MEDIA_TYPE_STATUS = 415;

export type UploadFailureReason =
  | "network"
  | "server"
  | "too-large"
  | "not-an-image";

// Carries a reason across the upload's own throw sites, so the caller does not
// have to re-derive one it already knows.
export class UploadFailedError extends Error {
  constructor(readonly reason: UploadFailureReason) {
    super(reason);
  }
}

export function isRetryableFailure(reason: UploadFailureReason): boolean {
  return reason === "network" || reason === "server";
}

// Browsers report no type for some camera formats, so the extension stands in
// whenever the type says nothing — but only then, or a renamed video would
// pass on its extension alone.
export function isPhotoUpload(file: {
  contentType: string;
  filename: string;
}): boolean {
  const contentType = file.contentType.toLowerCase();
  if (contentType.startsWith("image/")) return true;
  if (contentType !== "" && contentType !== "application/octet-stream") {
    return false;
  }
  return hasImageExtension(file.filename);
}

export function precheckUpload(
  file: { sizeBytes: number; contentType: string; filename: string },
  maxFileBytes: number | null,
): UploadFailureReason | null {
  if (!isPhotoUpload(file)) return "not-an-image";
  if (maxFileBytes !== null && file.sizeBytes > maxFileBytes) return "too-large";
  return null;
}

export function failureFromStatus(status: number): UploadFailureReason {
  return status === UNSUPPORTED_MEDIA_TYPE_STATUS ? "not-an-image" : "server";
}

export function classifyUploadFailure(error: unknown): UploadFailureReason {
  if (error instanceof UploadFailedError) return error.reason;
  // A tus error names the request it came from and holds the response only
  // when one arrived; without one the request never got through.
  if (
    typeof error === "object" &&
    error !== null &&
    "originalRequest" in error &&
    "originalResponse" in error
  ) {
    return error.originalResponse === null ? "network" : "server";
  }
  // fetch rejects with a TypeError when the request never completed.
  if (error instanceof TypeError) return "network";
  return "server";
}
