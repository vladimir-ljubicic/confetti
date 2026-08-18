import { describe, expect, it } from "vitest";
import { resolveLocale } from "./i18n";

describe("resolveLocale", () => {
  it("defaults to Serbian when no value is stored", () => {
    expect(resolveLocale(undefined)).toBe("sr");
  });

  it("defaults to Serbian for unknown values", () => {
    expect(resolveLocale("fr")).toBe("sr");
    expect(resolveLocale("")).toBe("sr");
  });

  it("returns supported locales as-is", () => {
    expect(resolveLocale("sr")).toBe("sr");
    expect(resolveLocale("en")).toBe("en");
  });
});
