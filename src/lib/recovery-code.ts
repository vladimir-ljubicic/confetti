// Crockford base32: I, L, O and U are left out, so a handwritten code cannot be
// misread and cannot spell a word. I and L read back as 1, O as 0.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const RECOVERY_CODE_LENGTH = 6;

function randomBytes(size: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(size));
}

// 256 is a whole number of alphabets, so the remainder favours no character.
export function generateRecoveryCode(
  bytes: (size: number) => Uint8Array = randomBytes,
): string {
  const source = bytes(RECOVERY_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < RECOVERY_CODE_LENGTH; i += 1) {
    code += ALPHABET[source[i] % ALPHABET.length];
  }
  return code;
}

export function normalizeRecoveryCode(input: string): string | null {
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]+/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
  if (cleaned.length !== RECOVERY_CODE_LENGTH) return null;
  return [...cleaned].every((character) => ALPHABET.includes(character))
    ? cleaned
    : null;
}

export function formatRecoveryCode(code: string): string {
  const half = Math.ceil(code.length / 2);
  return `${code.slice(0, half)}-${code.slice(half)}`;
}
