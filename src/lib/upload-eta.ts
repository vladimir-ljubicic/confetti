const MINUTE_MS = 60_000;

export function estimateRemainingMs(
  uploadedBytes: number,
  totalBytes: number,
  elapsedMs: number,
): number | null {
  if (uploadedBytes <= 0 || elapsedMs <= 0) return null;
  return Math.max(0, ((totalBytes - uploadedBytes) * elapsedMs) / uploadedBytes);
}

export type EtaLabels = { minutes: string; underMinute: string };

export function formatEta(remainingMs: number, labels: EtaLabels): string {
  const minutes = Math.ceil(remainingMs / MINUTE_MS);
  if (minutes <= 1) return labels.underMinute;
  return labels.minutes.replace("{min}", String(minutes));
}
