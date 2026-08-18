// 423 Locked
export const UPLOADS_FROZEN_STATUS = 423;

export function parseUploadsFrozenField(body: unknown): boolean | null {
  if (typeof body !== "object" || body === null) return null;
  const { uploadsFrozen } = body as Record<string, unknown>;
  return typeof uploadsFrozen === "boolean" ? uploadsFrozen : null;
}
