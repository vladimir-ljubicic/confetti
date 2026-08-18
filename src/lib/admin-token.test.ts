import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminToken,
  passcodeMatches,
  verifyAdminToken,
} from "./admin-token";

const SECRET = "correct-horse-battery-staple";
const NOW = 1_755_500_000_000;

describe("createAdminToken / verifyAdminToken", () => {
  it("verifies a token it created", () => {
    const token = createAdminToken(SECRET, NOW);
    expect(verifyAdminToken(SECRET, token, NOW)).toBe(true);
  });

  it("keeps verifying for the full session lifetime", () => {
    const token = createAdminToken(SECRET, NOW);
    const almostExpired = NOW + ADMIN_SESSION_MAX_AGE_SECONDS * 1000 - 1;
    expect(verifyAdminToken(SECRET, token, almostExpired)).toBe(true);
  });

  it("rejects an expired token", () => {
    const token = createAdminToken(SECRET, NOW);
    const expired = NOW + ADMIN_SESSION_MAX_AGE_SECONDS * 1000 + 1;
    expect(verifyAdminToken(SECRET, token, expired)).toBe(false);
  });

  it("rejects a token issued in the future", () => {
    const token = createAdminToken(SECRET, NOW + 60_000);
    expect(verifyAdminToken(SECRET, token, NOW)).toBe(false);
  });

  it("rejects a token signed with a different secret", () => {
    const token = createAdminToken("other-secret", NOW);
    expect(verifyAdminToken(SECRET, token, NOW)).toBe(false);
  });

  it("rejects a token with a tampered timestamp", () => {
    const token = createAdminToken(SECRET, NOW);
    const [, signature] = token.split(".");
    expect(verifyAdminToken(SECRET, `${NOW + 1}.${signature}`, NOW)).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(verifyAdminToken(SECRET, undefined, NOW)).toBe(false);
    expect(verifyAdminToken(SECRET, "", NOW)).toBe(false);
    expect(verifyAdminToken(SECRET, "no-dot", NOW)).toBe(false);
    expect(verifyAdminToken(SECRET, "abc.def", NOW)).toBe(false);
    expect(verifyAdminToken(SECRET, `${NOW}.`, NOW)).toBe(false);
    expect(verifyAdminToken(SECRET, `${NOW}.zzzz`, NOW)).toBe(false);
  });
});

describe("passcodeMatches", () => {
  it("accepts the exact passcode", () => {
    expect(passcodeMatches(SECRET, SECRET)).toBe(true);
  });

  it("rejects anything else", () => {
    expect(passcodeMatches(SECRET, "wrong")).toBe(false);
    expect(passcodeMatches(SECRET, "")).toBe(false);
    expect(passcodeMatches(SECRET, SECRET + " ")).toBe(false);
  });
});
