import type { Dictionary } from "@/lib/dictionaries";
import type { UploadFailureReason } from "@/lib/upload-failure";
import type { UploadTileLabels } from "./upload-queue";

export function uploadFailureLabels(
  dict: Dictionary,
): Record<UploadFailureReason, string> {
  return {
    network: dict.upload.failureNetwork,
    server: dict.upload.failureServer,
    "too-large": dict.upload.failureTooLarge,
    "not-an-image": dict.upload.failureNotAnImage,
  };
}

export function uploadTileLabels(dict: Dictionary): UploadTileLabels {
  return {
    retry: dict.upload.retry,
    cancelled: dict.upload.cancelled,
    restore: dict.upload.restore,
    cancelUpload: dict.upload.cancelUpload,
    waiting: dict.upload.waiting,
    skip: dict.upload.skip,
    failure: uploadFailureLabels(dict),
  };
}
