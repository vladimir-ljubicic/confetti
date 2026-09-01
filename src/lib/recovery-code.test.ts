import { describe, expect, it } from "vitest";
import {
  RECOVERY_CODE_LENGTH,
  formatRecoveryCode,
  generateRecoveryCode,
  normalizeRecoveryCode,
} from "./recovery-code";

function bytes(...values: number[]) {
  return () => Uint8Array.from(values);
}

describe("generateRecoveryCode", () => {
  it("maps each byte onto the alphabet", () => {
    expect(generateRecoveryCode(bytes(0, 1, 9, 10, 30, 31))).toBe("019AYZ");
  });

  it("wraps bytes above the alphabet without favouring any letter", () => {
    expect(generateRecoveryCode(bytes(32, 64, 96, 128, 160, 255))).toBe("00000Z");
  });

  it("is six characters long", () => {
    expect(generateRecoveryCode()).toHaveLength(RECOVERY_CODE_LENGTH);
  });

  it("never mints a character outside the alphabet", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateRecoveryCode()).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/);
    }
  });
});

describe("normalizeRecoveryCode", () => {
  it("accepts a code as it was minted", () => {
    expect(normalizeRecoveryCode("K7MQ4P")).toBe("K7MQ4P");
  });

  it("upper-cases what the guest typed", () => {
    expect(normalizeRecoveryCode("k7mq4p")).toBe("K7MQ4P");
  });

  it("ignores the separator and surrounding spaces", () => {
    expect(normalizeRecoveryCode("  K7M-Q4P ")).toBe("K7MQ4P");
    expect(normalizeRecoveryCode("K7M Q4P")).toBe("K7MQ4P");
  });

  it("reads the letters left out of the alphabet as their lookalikes", () => {
    expect(normalizeRecoveryCode("OIL234")).toBe("011234");
    expect(normalizeRecoveryCode("oil234")).toBe("011234");
  });

  it("rejects a code of the wrong length", () => {
    expect(normalizeRecoveryCode("K7MQ4")).toBeNull();
    expect(normalizeRecoveryCode("K7MQ4PP")).toBeNull();
    expect(normalizeRecoveryCode("")).toBeNull();
  });

  it("rejects characters that are neither alphabet nor lookalike", () => {
    expect(normalizeRecoveryCode("K7MQ4Ć")).toBeNull();
    expect(normalizeRecoveryCode("K7MQ4_")).toBeNull();
    expect(normalizeRecoveryCode("K7MQ4U")).toBeNull();
  });
});

describe("formatRecoveryCode", () => {
  it("splits the code into two halves the eye can hold", () => {
    expect(formatRecoveryCode("K7MQ4P")).toBe("K7M-Q4P");
  });
});
