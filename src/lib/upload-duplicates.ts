type Hashed = { hash: string | null };

// A photo that could not be hashed goes up: unknown content is never judged a
// duplicate.
export function partitionDuplicates<T extends Hashed>(
  items: readonly T[],
  uploaded: ReadonlySet<string>,
): { fresh: T[]; skipped: T[] } {
  const seen = new Set<string>();
  const fresh: T[] = [];
  const skipped: T[] = [];
  for (const item of items) {
    const duplicate =
      item.hash !== null && (uploaded.has(item.hash) || seen.has(item.hash));
    if (duplicate) {
      skipped.push(item);
      continue;
    }
    if (item.hash !== null) seen.add(item.hash);
    fresh.push(item);
  }
  return { fresh, skipped };
}
