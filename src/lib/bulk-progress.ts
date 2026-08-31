// One step of a bulk action the client drives request by request: how many
// photos this request handled and how many still wait.
export type BulkProgress = { done: number; remaining: number };

export function parseBulkProgress(body: unknown): BulkProgress | null {
  if (typeof body !== "object" || body === null) return null;
  const { done, remaining } = body as Record<string, unknown>;
  if (!Number.isInteger(done) || !Number.isInteger(remaining)) return null;
  if ((done as number) < 0 || (remaining as number) < 0) return null;
  return { done: done as number, remaining: remaining as number };
}
