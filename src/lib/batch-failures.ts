import { INTL_LOCALES, pluralize, type Locale, type PluralForms } from "./i18n";
import { isRetryableFailure, type UploadFailureReason } from "./upload-failure";

// Attempts after which another one is not worth offering.
export const DEAD_END_ATTEMPTS = 3;

export type BatchFailure = {
  id: number;
  previewUrl: string;
  reason: UploadFailureReason;
  sizeBytes: number;
  // How far the upload got before it broke; 0 when it never started.
  uploadedBytes: number;
  // Failed attempts so far, the first one included.
  attempts: number;
};

export type FailureDetailLabels = {
  uploadedPercent: string;
  maxSize: string;
  unsupportedFormat: string;
};

export type FailureReasonLabels = {
  reason: Record<UploadFailureReason, string>;
  attempts: PluralForms;
};

type AttemptedFailure = { reason: UploadFailureReason; attempts: number };

export function isDeadEndFailure(failure: AttemptedFailure): boolean {
  return (
    isRetryableFailure(failure.reason) && failure.attempts >= DEAD_END_ATTEMPTS
  );
}

export function groupFailures<T extends AttemptedFailure>(
  failures: readonly T[],
): { retryable: T[]; deadEnd: T[]; unretryable: T[] } {
  return {
    retryable: failures.filter(
      (failure) =>
        isRetryableFailure(failure.reason) && !isDeadEndFailure(failure),
    ),
    deadEnd: failures.filter(isDeadEndFailure),
    unretryable: failures.filter(
      (failure) => !isRetryableFailure(failure.reason),
    ),
  };
}

// What went wrong. The count joins it only once a photo has cost more than one
// attempt.
export function failureReason(
  failure: AttemptedFailure,
  labels: FailureReasonLabels,
  locale: Locale,
): string {
  const reason = labels.reason[failure.reason];
  if (failure.attempts < 2) return reason;
  return `${reason} · ${pluralize(locale, failure.attempts, labels.attempts)}`;
}

// "512 KB" / "4,1 MB" / "62 MB" — decimal units, with the locale's decimal mark.
export function formatPhotoSize(bytes: number, locale: Locale): string {
  const format = (value: number) =>
    new Intl.NumberFormat(INTL_LOCALES[locale]).format(value);
  if (bytes < 1e6) return `${format(Math.max(1, Math.round(bytes / 1e3)))} KB`;
  const mb = bytes / 1e6;
  return `${format(mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10)} MB`;
}

// The second line of a failure row: what the guest can tell about the photo
// from the attempt itself, since the row never names the file.
export function failureDetail(
  failure: Pick<BatchFailure, "reason" | "sizeBytes" | "uploadedBytes">,
  labels: FailureDetailLabels,
  locale: Locale,
  maxFileBytes: number | null,
): string {
  if (failure.reason === "not-an-image") return labels.unsupportedFormat;
  const size = formatPhotoSize(failure.sizeBytes, locale);
  if (failure.reason === "too-large") {
    if (maxFileBytes === null) return size;
    const max = labels.maxSize.replace(
      "{max}",
      formatPhotoSize(maxFileBytes, locale),
    );
    return `${size} · ${max}`;
  }
  const percent =
    failure.sizeBytes > 0
      ? Math.round((failure.uploadedBytes / failure.sizeBytes) * 100)
      : 0;
  if (percent < 1) return size;
  const uploaded = labels.uploadedPercent.replace("{percent}", String(percent));
  return `${uploaded} · ${size}`;
}

// A failure whose tile is still in the grid goes back up through that tile; one
// from a bulk batch has no tile and starts a fresh batch from its file.
export function splitRetryTargets<T extends { tileId: number | null }>(
  entries: readonly T[],
): { tiles: (T & { tileId: number })[]; files: T[] } {
  return {
    tiles: entries.filter(
      (entry): entry is T & { tileId: number } => entry.tileId !== null,
    ),
    files: entries.filter((entry) => entry.tileId === null),
  };
}
