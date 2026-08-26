// 413 Content Too Large
export const FILE_TOO_LARGE_STATUS = 413;
// 429 Too Many Requests; the JSON body's `reason` field ("batch" | "window")
// tells the client which limit was hit.
export const RATE_LIMITED_STATUS = 429;

export type RateLimitReason = "batch" | "window";

export type UploadLimits = {
  maxBatch: number;
  maxPerWindow: number;
  windowMinutes: number;
  maxFileBytes: number;
};

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export type UploadVerdict =
  | { ok: true }
  | { ok: false; reason: "file-size" | RateLimitReason };

export function evaluateUpload(
  input: { fileBytes: number; batchSize: number; recentCount: number },
  limits: UploadLimits,
): UploadVerdict {
  if (input.fileBytes > limits.maxFileBytes) {
    return { ok: false, reason: "file-size" };
  }
  if (input.batchSize > limits.maxBatch) {
    return { ok: false, reason: "batch" };
  }
  if (input.recentCount >= limits.maxPerWindow) {
    return { ok: false, reason: "window" };
  }
  return { ok: true };
}

export function parseUploadLimits(
  env: Record<string, string | undefined>,
): UploadLimits {
  return {
    maxBatch: positiveInt(env.UPLOAD_MAX_BATCH, 100),
    maxPerWindow: positiveInt(env.UPLOAD_MAX_PER_WINDOW, 300),
    windowMinutes: positiveInt(env.UPLOAD_WINDOW_MINUTES, 15),
    maxFileBytes: positiveInt(env.UPLOAD_MAX_FILE_MB, 50) * 1024 * 1024,
  };
}
