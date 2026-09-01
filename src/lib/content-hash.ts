const HASH_PATTERN = /^[0-9a-f]{64}$/;

export function isContentHash(value: unknown): value is string {
  return typeof value === "string" && HASH_PATTERN.test(value);
}

// SHA-256 of the bytes, or null when the browser withholds the crypto API —
// it is absent on insecure origins — or the blob cannot be read. A null hash
// says nothing about the content, so callers must treat it as unknown rather
// than as a photo of its own.
export async function hashBlob(blob: Blob): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  try {
    const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  } catch {
    return null;
  }
}

// One at a time: a batch may hold a hundred photos of up to fifty megabytes,
// and each is read whole into memory to be hashed.
export async function hashBlobs(
  blobs: readonly Blob[],
): Promise<(string | null)[]> {
  const hashes: (string | null)[] = [];
  for (const blob of blobs) hashes.push(await hashBlob(blob));
  return hashes;
}
