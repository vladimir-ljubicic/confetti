import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { LONG_LIVED_COOKIE_MAX_AGE_SECONDS } from "./cookies";

export const ADMIN_COOKIE = "confetti_admin";
export const ADMIN_SESSION_MAX_AGE_SECONDS = LONG_LIVED_COOKIE_MAX_AGE_SECONDS;

function sign(secret: string, issuedAtMs: number): string {
  return createHmac("sha256", secret).update(String(issuedAtMs)).digest("hex");
}

// Hashing both sides equalizes length so timingSafeEqual never throws.
function constantTimeEquals(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

// Signed with the passcode itself, so changing the passcode revokes all
// existing admin sessions.
export function createAdminToken(secret: string, issuedAtMs: number): string {
  return `${issuedAtMs}.${sign(secret, issuedAtMs)}`;
}

export function verifyAdminToken(
  secret: string,
  token: string | undefined,
  nowMs: number,
): boolean {
  if (!token) return false;
  const [issuedAtPart, signature] = token.split(".");
  if (!issuedAtPart || !signature) return false;
  const issuedAtMs = Number(issuedAtPart);
  if (!Number.isInteger(issuedAtMs)) return false;
  if (!constantTimeEquals(signature, sign(secret, issuedAtMs))) return false;
  const age = nowMs - issuedAtMs;
  return age >= 0 && age <= ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
}

export function passcodeMatches(expected: string, provided: string): boolean {
  return constantTimeEquals(expected, provided);
}
